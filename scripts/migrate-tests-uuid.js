const { supabase } = require('../src/integrations/supabase/client');

// UUID generation function
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// UUID validation function
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

async function migrateTestsToUUID() {
  try {
    console.log('Starting test migration...');

    // Fetch all existing tests
    const { data: tests, error: fetchError } = await supabase
      .from('tests')
      .select('*');

    if (fetchError) {
      console.error('Error fetching tests:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${tests.length} tests to migrate`);

    // Migrate each test
    const migrationPromises = tests.map(async (test) => {
      // Generate a new UUID if the current ID is not valid
      const validUUID = isValidUUID(test.id) ? test.id : generateUUID();

      // Update the test with the new UUID
      const { error: updateError } = await supabase
        .from('tests')
        .update({ 
          id: validUUID,
          // Ensure other fields are properly formatted
          modules: test.modules ? JSON.stringify(test.modules) : null,
          scaled_scoring: test.scaled_scoring ? JSON.stringify(test.scaled_scoring) : null,
        })
        .eq('id', test.id);

      if (updateError) {
        console.error(`Error migrating test ${test.id}:`, updateError);
        return false;
      }
      return true;
    });

    // Wait for all migrations to complete
    const migrationResults = await Promise.allSettled(migrationPromises);

    // Log migration summary
    const successCount = migrationResults.filter(
      result => result.status === 'fulfilled' && result.value
    ).length;
    const failureCount = migrationResults.filter(
      result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value)
    ).length;

    console.log(`Migration complete. Successful: ${successCount}, Failed: ${failureCount}`);

    return {
      successCount,
      failureCount,
      totalTests: tests.length
    };
  } catch (error) {
    console.error('Migration process failed:', error);
    throw error;
  }
}

// Run the migration
migrateTestsToUUID()
  .then(result => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
