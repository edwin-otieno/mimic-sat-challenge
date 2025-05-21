import { migrateTestsToUUID } from '../src/services/testService';

async function runTestMigration() {
  try {
    console.log('Starting test migration...');
    const migrationResult = await migrateTestsToUUID();
    
    console.log('Migration Summary:');
    console.log(`Total Tests: ${migrationResult.totalTests}`);
    console.log(`Successful Migrations: ${migrationResult.successCount}`);
    console.log(`Failed Migrations: ${migrationResult.failureCount}`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runTestMigration();
