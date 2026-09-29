import { Request, Response } from 'express';

import { ApiResponse } from '../models/api-response.model';
import { modificationInfoTypes } from '../models/modification-info.model';
import {
  MemberTournamentResult,
  PlayerNameMatch,
  Tournament,
  TournamentInput,
  TournamentModel,
  TournamentRecord,
  TournamentRegistrant,
  TournamentResponse,
  TournamentSummary,
} from '../models/tournament.model';
import { findEditor, findLinkedMember } from '../services/member-accounts.service';
import { findProfilePlayerIds } from '../services/member-players.service';
import { takeNextTournamentNumber } from '../services/tournament-numbers.service';
import {
  matchPlayerNames,
  removeOrphanedPlayers,
} from '../services/tournament-players.service';
import {
  TOURNAMENT_SUMMARY_PIPELINE,
  toMemberTournamentResults,
  toRegistrants,
  toStoredSections,
  toTournamentResponse,
} from '../services/tournaments.service';
import { clubToday } from '../util/club-date.util';
import { creditEditor } from '../util/modification-info.util';
import { validateTournamentInput } from '../util/tournament-input.util';
import { validateObjectByTypes } from '../util/validate-object-by-types.util';

const MAX_MATCHED_NAMES = 2000;

type TournamentDetails = Pick<
  Tournament,
  | 'name'
  | 'subtitle'
  | 'date'
  | 'endDate'
  | 'format'
  | 'timeControl'
  | 'isRated'
  | 'articleUrl'
  | 'registrationOpens'
  | 'registrationCloses'
>;

const parseNumber = (value: string): number | null =>
  /^\d+$/.test(value) ? Number(value) : null;

const withoutFullStop = (message: string): string => message.replace(/\.$/, '');

function toDetails(input: TournamentInput): TournamentDetails {
  return {
    name: input.name.trim(),
    subtitle: input.subtitle.trim(),
    date: input.date,
    endDate: input.endDate,
    format: input.format,
    timeControl: input.timeControl.trim(),
    isRated: input.isRated,
    articleUrl: input.articleUrl?.trim() || null,
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
  const infoResult = validateObjectByTypes(
    (body as TournamentInput).modificationInfo,
    modificationInfoTypes,
  );
  if (infoResult !== 'valid') {
    return `Unable to save the tournament because its modification info is invalid: ${withoutFullStop(infoResult.message)}.`;
  }
  return null;
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
    const summaries = await TournamentModel.aggregate<TournamentSummary>(
      TOURNAMENT_SUMMARY_PIPELINE,
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
    const record = /^\d+$/.test(number)
      ? await TournamentModel.findOne({ number: Number(number) }).lean<TournamentRecord>()
      : null;

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
      modificationInfo: creditEditor(input.modificationInfo, editor, true),
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
    const number = parseNumber(req.params.number);
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
    const editor = await findEditor(req.user.id);
    const sections = input.sections
      ? await toStoredSections(input.sections, record.sections, input.format)
      : null;
    await TournamentModel.updateOne(
      { number },
      {
        $set: {
          ...toDetails(input),
          ...(sections ? { sections } : {}),
          modificationInfo: creditEditor(
            input.modificationInfo,
            editor,
            !record.modificationInfo,
          ),
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
    const number = parseNumber(req.params.number);
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
    const number = parseNumber(req.params.number);
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
    const number = parseNumber(req.params.number);
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
