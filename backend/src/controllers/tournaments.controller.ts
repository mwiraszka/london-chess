import { Request, Response } from 'express';

import { ApiResponse } from '../models/api-response.model';
import {
  GameInput,
  ImportChanges,
  MemberTournamentResult,
  PlayerNameMatch,
  SectionInput,
  TournamentDetails,
  TournamentInput,
  TournamentModel,
  TournamentRecord,
  TournamentRegistrant,
  TournamentResponse,
  TournamentSummary,
} from '../models/tournament.model';
import { findEditor, findLinkedMember } from '../services/member-accounts.service';
import { findProfilePlayerIds } from '../services/member-players.service';
import {
  archiveGames,
  classifyGames,
  withGameSections,
} from '../services/tournament-games.service';
import { takeNextTournamentNumber } from '../services/tournament-numbers.service';
import {
  matchPlayerNames,
  removeOrphanedPlayers,
  unknownPlayerIds,
} from '../services/tournament-players.service';
import {
  TOURNAMENT_SUMMARY_PIPELINE,
  TournamentSummaryRecord,
  compareSections,
  toMemberTournamentResults,
  toRegistrants,
  toStoredSections,
  toTournamentResponse,
} from '../services/tournaments.service';
import { clubToday } from '../util/club-date.util';
import { creditEditor } from '../util/modification-info.util';
import { parseRecordNumber } from '../util/parse-record-number.util';
import {
  gamesError,
  sectionsError,
  validateTournamentInput,
} from '../util/tournament-input.util';

const MAX_MATCHED_NAMES = 2000;

const withoutFullStop = (message: string): string => message.replace(/\.$/, '');

function toDetails(input: TournamentInput): TournamentDetails {
  return {
    name: input.name.trim(),
    subtitle: input.subtitle.trim(),
    date: input.date,
    endDate: input.endDate,
    format: input.format,
    timeControl: input.timeControl.trim(),
    roundCount: input.roundCount,
    isRated: input.isRated,
    articleId: input.articleId || null,
    registrationOpens: input.registrationOpens,
    registrationCloses: input.registrationCloses,
  };
}

// The problem with the request body, or null when the tournament can be saved
function invalidInput(body: unknown): string | null {
  const inputResult = validateTournamentInput(body);
  if (inputResult !== 'valid') {
    return `Unable to save the tournament because ${withoutFullStop(inputResult.message)}.`;
  }
  return null;
}

// Entries and games may name archive players directly, and each must be one the archive holds
async function unknownPlayerProblem(input: TournamentInput): Promise<string | null> {
  const ids = [
    ...(input.sections ?? []).flatMap(({ entries }) =>
      entries.flatMap(({ playerId }) => (playerId === null ? [] : [playerId])),
    ),
    ...(input.games ?? []).flatMap(({ whitePlayerId, blackPlayerId }) => [
      whitePlayerId,
      blackPlayerId,
    ]),
  ];
  return ids.length && (await unknownPlayerIds(ids)).length
    ? 'Unable to save the tournament because it names a player the archive does not hold.'
    : null;
}

const entryPlayerIds = (record: Pick<TournamentRecord, 'sections'>): string[] =>
  record.sections.flatMap(({ entries }) => entries.map(({ playerId }) => playerId));

// Members can withdraw up to the day the tournament starts, while no results are in
const isUpcoming = (record: TournamentRecord): boolean =>
  record.date >= clubToday() && record.sections.every(({ entries }) => !entries.length);

export async function getTournaments(
  _req: Request,
  res: Response<ApiResponse<TournamentSummary[]>>,
): Promise<void> {
  try {
    const records = await TournamentModel.aggregate<TournamentSummaryRecord>(
      TOURNAMENT_SUMMARY_PIPELINE,
    );
    const summaries = await Promise.all(
      records.map(async ({ registrations, ...summary }): Promise<TournamentSummary> => ({
        ...summary,
        registrants: await toRegistrants(registrations),
      })),
    );

    res.status(200).json({ data: summaries });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getTournament(
  req: Request<{ number: string }>,
  res: Response<ApiResponse<TournamentResponse>>,
): Promise<void> {
  try {
    const { number } = req.params;
    const tournamentNumber = parseRecordNumber(number);
    const record =
      tournamentNumber === null
        ? null
        : await TournamentModel.findOne({
            number: tournamentNumber,
          }).lean<TournamentRecord>();

    if (!record) {
      res.status(404).json({ message: `Unable to find tournament [${number}]` });
      return;
    }

    res.status(200).json({ data: await toTournamentResponse(record) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getMemberTournaments(
  req: Request<{ number: string }>,
  res: Response<ApiResponse<MemberTournamentResult[]>>,
): Promise<void> {
  try {
    const { number } = req.params;
    const playerIds = await findProfilePlayerIds(number);

    if (!playerIds) {
      res.status(404).json({ message: `Unable to find member [${number}]` });
      return;
    }

    const records = playerIds.length
      ? await TournamentModel.find({
          'sections.entries.playerId': { $in: playerIds },
        }).lean<TournamentRecord[]>()
      : [];

    res
      .status(200)
      .json({ data: toMemberTournamentResults(records, new Set(playerIds)) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function addTournament(
  req: Request,
  res: Response<ApiResponse<number>>,
): Promise<void> {
  try {
    const problem = invalidInput(req.body);
    if (problem) {
      res.status(400).json({ message: problem });
      return;
    }

    const input = req.body as TournamentInput;
    if (input.games?.length) {
      res.status(400).json({
        message:
          'Unable to save the tournament because games can only be added once it has been saved.',
      });
      return;
    }
    const playerProblem = await unknownPlayerProblem(input);
    if (playerProblem) {
      res.status(400).json({ message: playerProblem });
      return;
    }

    const editor = await findEditor(req.user.id);
    const number = await takeNextTournamentNumber();
    await TournamentModel.create({
      number,
      ...toDetails(input),
      gameArchiveTournament: null,
      sections: input.sections
        ? await toStoredSections(input.sections, [], input.format)
        : [],
      registrations: [],
      modificationInfo: creditEditor(editor, null),
    });

    res.status(201).json({ data: number });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function updateTournament(
  req: Request<{ number: string }>,
  res: Response<ApiResponse<number>>,
): Promise<void> {
  try {
    const number = parseRecordNumber(req.params.number);
    const record =
      number === null
        ? null
        : await TournamentModel.findOne({ number }).lean<TournamentRecord>();
    if (number === null || !record) {
      res.status(404).json({
        message: `Unable to update tournament [${req.params.number}] because it could not be found.`,
      });
      return;
    }

    const problem = invalidInput(req.body);
    if (problem) {
      res.status(400).json({ message: problem });
      return;
    }

    const input = req.body as TournamentInput;
    const playerProblem = await unknownPlayerProblem(input);
    if (playerProblem) {
      res.status(400).json({ message: playerProblem });
      return;
    }

    const editor = await findEditor(req.user.id);
    const games = input.games ?? [];
    const stored = input.sections
      ? await toStoredSections(input.sections, record.sections, input.format)
      : null;
    const sections = stored && games.length ? withGameSections(stored, games) : stored;
    // A tournament first given games through the site files them under its own name
    const gameArchiveTournament = record.gameArchiveTournament ?? input.name.trim();
    if (games.length) {
      // Games go in first, so saving again after a failure adds none of them twice
      await archiveGames(gameArchiveTournament, games, creditEditor(editor, null));
    }
    await TournamentModel.updateOne(
      { number },
      {
        $set: {
          ...toDetails(input),
          ...(sections ? { sections } : {}),
          ...(games.length ? { gameArchiveTournament } : {}),
          modificationInfo: creditEditor(editor, record.modificationInfo ?? null),
        },
      },
    );
    if (sections) {
      await removeOrphanedPlayers(entryPlayerIds(record));
    }

    res.status(200).json({ data: number });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function deleteTournament(
  req: Request<{ number: string }>,
  res: Response<ApiResponse<number>>,
): Promise<void> {
  try {
    const number = parseRecordNumber(req.params.number);
    const record =
      number === null
        ? null
        : await TournamentModel.findOneAndDelete({ number }).lean<TournamentRecord>();
    if (number === null || !record) {
      res.status(404).json({
        message: `Unable to delete tournament [${req.params.number}] because it could not be found.`,
      });
      return;
    }

    await removeOrphanedPlayers(entryPlayerIds(record));
    res.status(200).json({ data: number });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function matchTournamentPlayers(
  req: Request,
  res: Response<ApiResponse<PlayerNameMatch[]>>,
): Promise<void> {
  try {
    const names: unknown = req.body?.names;
    if (
      !Array.isArray(names) ||
      names.length > MAX_MATCHED_NAMES ||
      names.some(name => typeof name !== 'string' || !name.trim())
    ) {
      res.status(400).json({ message: 'Player names must be a list of names.' });
      return;
    }

    res.status(200).json({ data: await matchPlayerNames(names) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// What saving these imported results and games would change, as the save works it out
export async function checkTournamentImport(
  req: Request<{ number: string }>,
  res: Response<ApiResponse<ImportChanges>>,
): Promise<void> {
  try {
    const number = parseRecordNumber(req.params.number);
    const record =
      number === null
        ? null
        : await TournamentModel.findOne(
            { number },
            { name: 1, gameArchiveTournament: 1, sections: 1 },
          ).lean<Pick<TournamentRecord, 'name' | 'gameArchiveTournament' | 'sections'>>();
    if (!record) {
      res.status(404).json({
        message: `Unable to check the import for tournament [${req.params.number}] because it could not be found.`,
      });
      return;
    }

    const sections: unknown = req.body?.sections;
    const games: unknown = req.body?.games;
    const problem = sectionsError(sections) ?? gamesError(games);
    if (problem) {
      res.status(400).json({
        message: `Unable to check the import because ${withoutFullStop(problem)}.`,
      });
      return;
    }

    const inputs = sections as SectionInput[];
    const { changed, removed } = await compareSections(inputs, record.sections);
    res.status(200).json({
      data: {
        sectionChanges: changed,
        removedSections: removed,
        games: await classifyGames(
          record.gameArchiveTournament ?? record.name,
          games as GameInput[],
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

function closedRegistrationMessage(record: TournamentRecord, now: string): string {
  if (!record.registrationOpens || !record.registrationCloses) {
    return 'This tournament does not take registrations online.';
  }
  return now < record.registrationOpens
    ? 'Registration for this tournament has not opened yet.'
    : 'Registration for this tournament has closed.';
}

export async function registerForTournament(
  req: Request<{ number: string }>,
  res: Response<ApiResponse<TournamentRegistrant[]>>,
): Promise<void> {
  try {
    const number = parseRecordNumber(req.params.number);
    const exists = number !== null && (await TournamentModel.exists({ number }));
    if (number === null || !exists) {
      res.status(404).json({ message: 'Unable to find this tournament.' });
      return;
    }

    const member = await findLinkedMember(req.user.id);
    if (!member) {
      res
        .status(403)
        .json({ message: 'Only club members can register for tournaments.' });
      return;
    }

    const memberId = member._id.toString();
    const now = new Date().toISOString();
    // The window is checked in the same write that adds the member, so a registration
    // can never slip in after it closes
    await TournamentModel.updateOne(
      {
        number,
        registrationOpens: { $lte: now },
        registrationCloses: { $gt: now },
        'registrations.memberId': { $ne: memberId },
      },
      { $push: { registrations: { memberId, registeredAt: now } } },
    );

    const record = await TournamentModel.findOne({ number }).lean<TournamentRecord>();
    const registrations = record?.registrations ?? [];
    if (
      !record ||
      !registrations.some(registration => registration.memberId === memberId)
    ) {
      res.status(409).json({
        message: record
          ? closedRegistrationMessage(record, now)
          : 'Unable to find this tournament.',
      });
      return;
    }

    res.status(200).json({ data: await toRegistrants(registrations) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function withdrawFromTournament(
  req: Request<{ number: string }>,
  res: Response<ApiResponse<TournamentRegistrant[]>>,
): Promise<void> {
  try {
    const number = parseRecordNumber(req.params.number);
    const record =
      number === null
        ? null
        : await TournamentModel.findOne({ number }).lean<TournamentRecord>();
    if (number === null || !record) {
      res.status(404).json({ message: 'Unable to find this tournament.' });
      return;
    }

    const member = await findLinkedMember(req.user.id);
    if (!member) {
      res
        .status(403)
        .json({ message: 'Only club members can register for tournaments.' });
      return;
    }

    if (!isUpcoming(record)) {
      res.status(409).json({
        message:
          'This tournament has already started, so registrations can no longer change.',
      });
      return;
    }

    const updated = await TournamentModel.findOneAndUpdate(
      { number },
      { $pull: { registrations: { memberId: member._id.toString() } } },
      { returnDocument: 'after' },
    ).lean<TournamentRecord>();

    res.status(200).json({ data: await toRegistrants(updated?.registrations ?? []) });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}
