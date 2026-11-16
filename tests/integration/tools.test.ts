import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { dbManager } from '../../src/pg/ConnectionManager.js';
import { describeTableHandler } from '../../src/tools/describeTable.js';
import { executeSafeQueryHandler } from '../../src/tools/executeSafeQuery.js';
import { explainQueryHandler } from '../../src/tools/explainQuery.js';
import { getDatabaseOverviewHandler } from '../../src/tools/getDatabaseOverview.js';
import { listAvailableDatabasesHandler } from '../../src/tools/listAvailableDatabases.js';
import { pingHandler } from '../../src/tools/ping.js';
import { searchSchemaHandler } from '../../src/tools/searchSchema.js';
import { switchDatabaseHandler } from '../../src/tools/switchDatabase.js';

describe('pg-inspector Integration Tests', () => {
  const testDbUrl = 'postgresql://test_user:test_password@localhost:5433/test_db';
  const testAlias = 'integration_test_db';
  let sql: postgres.Sql;

  beforeAll(async () => {
    try {
      // 1. Connect to the clean test database
      sql = postgres(testDbUrl, { 
        max: 1, 
        connect_timeout: 10 // Fail fast if Docker isn't ready
      });

      // 2. Wait for DB to be ready (critical for CI Docker startup)
      await sql`SELECT 1`;

      // 3. Seed it with a predictable, isolated schema for testing
      await sql`CREATE TABLE test_users (id SERIAL PRIMARY KEY, name TEXT, email TEXT)`;
      await sql`CREATE TABLE test_orders (id SERIAL PRIMARY KEY, user_id INT REFERENCES test_users(id), total NUMERIC)`;
      await sql`INSERT INTO test_users (name, email) VALUES ('Alice', 'alice@test.com')`;
      await sql`INSERT INTO test_orders (user_id, total) VALUES (1, 99.99)`;
      await sql`CREATE INDEX idx_test_users_email ON test_users(email)`;

      // 4. Register it in the ConnectionManager for the tools to use
      dbManager.addConnection(testAlias, testDbUrl);
    } catch (error) {
      console.error("FATAL: beforeAll setup failed:", error);
      throw error; // Force Vitest to show the real error instead of skipping
    }
  }, 30000); // Give Docker 30 seconds to start and be ready

  afterAll(async () => {
    try {
      // 5. Clean up: Drop the tables so the next test run starts fresh
      await sql`DROP TABLE IF EXISTS test_orders CASCADE`;
      await sql`DROP TABLE IF EXISTS test_users CASCADE`;
      await sql.end();
    } catch (error) {
      console.error("Warning: afterAll cleanup failed:", error);
    }
  });

  it('should return pong from the ping handler', async () => {
    const result = await pingHandler({});
    expect(result.content[0].text).toBe('pong');
  });

  it('should list the integration test connection through the list handler', async () => {
    const result = await listAvailableDatabasesHandler({});
    expect(result.content[0].text).toContain(testAlias);
  });

  it('should switch the active database through the switch handler', async () => {
    const result = await switchDatabaseHandler({ alias: testAlias });
    expect(result.content[0].text).toBe(`Active database switched to '${testAlias}'.`);
  });

  it('should describe test_users, including its primary key and index', async () => {
    const result = await describeTableHandler({
      table_name: 'test_users',
      schema_name: 'public',
      alias: testAlias
    });
    
    // If the handler returned an error, parse it to show a better test failure message
    if (result.isError) {
      throw new Error(result.content[0].text);
    }
    
    const description = JSON.parse(result.content[0].text);

    expect(description.columns).toHaveLength(3);
    expect(description.columns[0]).toMatchObject({
      name: 'id',
      type: 'integer',
      nullable: false
    });
    expect(Object.values(description.constraints)).toContainEqual(
      expect.objectContaining({ type: 'PRIMARY KEY', columns: ['id'] })
    );
    expect(description.indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'idx_test_users_email',
        definition: expect.stringContaining('email')
      })
    ]));
  });

  it('should report the foreign key in the database overview handler', async () => {
    const result = await getDatabaseOverviewHandler({ alias: testAlias });
    if (result.isError) throw new Error(result.content[0].text);
    
    const overview = JSON.parse(result.content[0].text);
    const orders = overview.schema.find((table: any) => table.table === 'test_orders');

    expect(orders.foreign_keys).toContainEqual({
      column: 'user_id',
      references: 'test_users(id)'
    });
  });

  it('should find matching tables and columns through the search handler', async () => {
    const result = await searchSchemaHandler({ search_term: 'email', alias: testAlias });
    if (result.isError) throw new Error(result.content[0].text);
    
    expect(result.content[0].text).toContain('"table": "test_users"');
    expect(result.content[0].text).toContain('"name": "email"');
  });

  it('should execute a SELECT query through the safe query handler', async () => {
    const result = await executeSafeQueryHandler({
      query: 'SELECT name, email FROM test_users',
      alias: testAlias
    });
    if (result.isError) throw new Error(result.content[0].text);

    expect(JSON.parse(result.content[0].text)).toEqual([
      { name: 'Alice', email: 'alice@test.com' }
    ]);
  });

  it('should reject non-SELECT queries through the safe query handler', async () => {
    const result = await executeSafeQueryHandler({
      query: 'DELETE FROM test_users',
      alias: testAlias
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Only SELECT queries are allowed');
  });

  it('should generate a query plan through the explain handler', async () => {
    const result = await explainQueryHandler({
      query: 'SELECT * FROM test_users',
      alias: testAlias
    });
    if (result.isError) throw new Error(result.content[0].text);

    expect(result.content[0].text).toContain('Query Plan:');
    expect(result.content[0].text).toContain('estimated plan');
  });
});