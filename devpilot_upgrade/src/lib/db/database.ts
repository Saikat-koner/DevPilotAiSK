import 'server-only';

import fs from 'node:fs';
import Database from 'better-sqlite3';

import { DATA_DIR, DB_PATH } from '@/lib/config';
import type {
  MissionRecord,
  RepositoryRecord,
} from '@/lib/types';

// Database row types

type RepositoryRow = {
  id: string;
  name: string;
  root_path: string;
  file_count: number;
  total_bytes: number;
  analysis_json: string | null;
  created_at: string;
};

type MissionPayloadRow = {
  payload_json: string;
};

type CountRow = {
  count: number;
};

type RepositoryStatsRow = {
  count: number;
  files: number;
};

type MissionStatusRow = {
  status: string;
  count: number;
};

type GenerationRow = {
  id: string;
  user_id: string | null;
  prompt: string;
  stack: string | null;
  summary: string;
  file_count: number;
  created_at: string;
  result_json: string;
};

// Database initialization

fs.mkdirSync(DATA_DIR, {
  recursive: true,
  mode: 0o700,
});

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);

    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL,
        file_count INTEGER NOT NULL,
        total_bytes INTEGER NOT NULL,
        analysis_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS missions (
        id TEXT PRIMARY KEY,
        repo_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        FOREIGN KEY(repo_id) REFERENCES repositories(id)
      );

      CREATE TABLE IF NOT EXISTS studio_generations (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        prompt TEXT NOT NULL,
        stack TEXT,
        summary TEXT NOT NULL,
        file_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        result_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_generations_created
        ON studio_generations(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_missions_created
        ON missions(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_missions_repo
        ON missions(repo_id);
    `);
  }

  return dbInstance;
}

// Repository operations

export function saveRepository(repo: RepositoryRecord): void {
  getDb()
    .prepare(`
      INSERT INTO repositories (
        id,
        name,
        root_path,
        file_count,
        total_bytes,
        analysis_json,
        created_at
      )
      VALUES (
        @id,
        @name,
        @rootPath,
        @fileCount,
        @totalBytes,
        @analysis,
        @createdAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        root_path = excluded.root_path,
        file_count = excluded.file_count,
        total_bytes = excluded.total_bytes,
        analysis_json = excluded.analysis_json
    `)
    .run({
      ...repo,
      rootPath: repo.rootPath,
      analysis: repo.analysis
        ? JSON.stringify(repo.analysis)
        : null,
    });
}

export function getRepository(
  id: string
): RepositoryRecord | null {
  const row = getDb()
    .prepare('SELECT * FROM repositories WHERE id = ?')
    .get(id) as RepositoryRow | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    rootPath: row.root_path,
    fileCount: row.file_count,
    totalBytes: row.total_bytes,
    analysis: row.analysis_json
      ? JSON.parse(row.analysis_json)
      : undefined,
    createdAt: row.created_at,
  };
}

export function listRepositories(
  limit = 20
): RepositoryRecord[] {
  const rows = getDb()
    .prepare(`
      SELECT *
      FROM repositories
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit) as RepositoryRow[];

  return rows.map((row): RepositoryRecord => ({
    id: row.id,
    name: row.name,
    rootPath: row.root_path,
    fileCount: row.file_count,
    totalBytes: row.total_bytes,
    analysis: row.analysis_json
      ? JSON.parse(row.analysis_json)
      : undefined,
    createdAt: row.created_at,
  }));
}

// Mission operations

export function saveMission(
  mission: MissionRecord
): void {
  getDb()
    .prepare(`
      INSERT INTO missions (
        id,
        repo_id,
        status,
        created_at,
        updated_at,
        payload_json
      )
      VALUES (
        @id,
        @repoId,
        @status,
        @createdAt,
        @updatedAt,
        @payload
      )
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
    `)
    .run({
      id: mission.id,
      repoId: mission.repoId,
      status: mission.status,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
      payload: JSON.stringify(mission),
    });
}

export function getMission(
  id: string
): MissionRecord | null {
  const row = getDb()
    .prepare(`
      SELECT payload_json
      FROM missions
      WHERE id = ?
    `)
    .get(id) as MissionPayloadRow | undefined;

  return row
    ? (JSON.parse(row.payload_json) as MissionRecord)
    : null;
}

export function listMissions(
  limit = 30
): MissionRecord[] {
  const rows = getDb()
    .prepare(`
      SELECT payload_json
      FROM missions
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit) as MissionPayloadRow[];

  return rows.map(
    (row) =>
      JSON.parse(row.payload_json) as MissionRecord
  );
}

// Analytics

export function getAnalytics() {
  const db = getDb();

  const missionCounts = db
    .prepare(`
      SELECT status, COUNT(*) AS count
      FROM missions
      GROUP BY status
    `)
    .all() as MissionStatusRow[];

  const repos = db
    .prepare(`
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(file_count), 0) AS files
      FROM repositories
    `)
    .get() as RepositoryStatsRow;

  const missions = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM missions
    `)
    .get() as CountRow;

  const completed = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM missions
      WHERE status = 'completed'
    `)
    .get() as CountRow;

  return {
    repositories: repos.count,
    indexedFiles: repos.files,
    missions: missions.count,
    completed: completed.count,
    completionRate: missions.count
      ? Math.round(
          (completed.count / missions.count) * 100
        )
      : 0,
    statuses: Object.fromEntries(
      missionCounts.map((row) => [
        row.status,
        row.count,
      ])
    ),
  };
}

// Test database cleanup

export function clearDbForTests(): void {
  const db = getDb();

  db.exec(`
    DELETE FROM missions;
    DELETE FROM repositories;
  `);
}

// Studio generation operations

export type GenerationRecord = {
  id: string;
  userId?: string | null;
  prompt: string;
  stack: string;
  summary: string;
  fileCount: number;
  createdAt: string;
  result: unknown;
};

export function saveGeneration(
  record: GenerationRecord
): void {
  getDb()
    .prepare(`
      INSERT INTO studio_generations (
        id,
        user_id,
        prompt,
        stack,
        summary,
        file_count,
        created_at,
        result_json
      )
      VALUES (
        @id,
        @userId,
        @prompt,
        @stack,
        @summary,
        @fileCount,
        @createdAt,
        @result
      )
    `)
    .run({
      ...record,
      userId: record.userId ?? null,
      result: JSON.stringify(record.result),
    });
}

export function listGenerations(
  limit = 30,
  userId?: string | null
): GenerationRecord[] {
  const safeLimit = Math.max(
    1,
    Math.min(limit, 100)
  );

  const rows: GenerationRow[] = userId
    ? (getDb()
        .prepare(`
          SELECT *
          FROM studio_generations
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `)
        .all(userId, safeLimit) as GenerationRow[])
    : (getDb()
        .prepare(`
          SELECT *
          FROM studio_generations
          WHERE user_id IS NULL
          ORDER BY created_at DESC
          LIMIT ?
        `)
        .all(safeLimit) as GenerationRow[]);

  return rows.map(
    (row): GenerationRecord => ({
      id: row.id,
      userId: row.user_id ?? null,
      prompt: row.prompt,
      stack: row.stack ?? '',
      summary: row.summary,
      fileCount: row.file_count,
      createdAt: row.created_at,
      result: JSON.parse(row.result_json),
    })
  );
}