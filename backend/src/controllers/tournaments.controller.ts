import { Request, Response } from 'express';

import { ApiResponse } from '../models/api-response.model';
import { MemberModel, MemberRecord } from '../models/member.model';
import { PlayerModel, PlayerRecord } from '../models/player.model';
import {
  MemberTournamentResult,
  TournamentModel,
  TournamentRecord,
  TournamentResponse,
  TournamentSummary,
} from '../models/tournament.model';
import {
  TOURNAMENT_SUMMARY_PIPELINE,
  toMemberTournamentResults,
  toTournamentResponse,
} from '../services/tournaments.service';

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
    const member = /^\d+$/.test(number)
      ? await MemberModel.findOne(
          { number: Number(number), 'account.clerkUserId': { $ne: null } },
          { _id: 1 },
        ).lean<Pick<MemberRecord, '_id'>>()
      : null;

    if (!member) {
      res.status(404).json({ message: `Unable to find member [${number}]` });
      return;
    }

    const players = await PlayerModel.find(
      { memberId: member._id.toString() },
      { _id: 1 },
    ).lean<Pick<PlayerRecord, '_id'>[]>();
    const playerIds = players.map(({ _id }) => _id.toString());
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
