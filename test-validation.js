/**
 * 🧪 QUICK VALIDATION TEST SCRIPT
 * Rulează acest script pentru a testa assumptions-urile și identificarea erorilor
 */

import N8NIntegrationService from './N8NIntegrationService.js';

// ===== 🧪 TEST DATA SAMPLES =====

const testAppointmentScenarios = [
    {
        name: "Perfect Data (firstname/lastname)",
        data: {
            id: 'test_001',
            customer: {
                firstname: 'John',
                lastname: 'Doe',
                phone: '+40123456789',
                email: 'john.doe@example.com'
            },
            start_date: '2024-01-15',
            start_time: '10:00',
            location: { name: 'Magic Hub Center' },
            status: 'new'
        },
        expectedResult: 'PASS'
    },
    {
        name: "Full Name Only (risky splitting)",
        data: {
            id: 'test_002',
            customer: {
                name: 'Maria Elena Popescu',
                phone: '+40987654321',
                email: 'maria.popescu@gmail.com'
            },
            start_date: '2024-01-16',
            start_time: '14:30',
            location: { name: 'Magic Hub Bucuresti' },
            status: 'new'
        },
        expectedResult: 'WARNING'
    },
    {
        name: "Missing Customer Data (critical error)",
        data: {
            id: 'test_003',
            start_date: '2024-01-17',
            start_time: '09:00',
            location: { name: 'Magic Hub Test' },
            status: 'new'
        },
        expectedResult: 'FAIL'
    },
    {
        name: "Alternative Date Fields",
        data: {
            id: 'test_004',
            customer: {
                firstname: 'Ana',
                lastname: 'Ionescu',
                phone: '+40555123456',
                email: 'ana.ionescu@yahoo.com'
            },
            date: '2024-01-18',  // Nu start_date
            time: '16:00',       // Nu start_time
            location: 'Magic Hub Direct String',  // Nu object
            status: 'new'
        },
        expectedResult: 'PASS'
    },
    {
        name: "Invalid Phone Format",
        data: {
            id: 'test_005',
            customer: {
                firstname: 'Test',
                lastname: 'User',
                phone: '0123456789',  // Missing +40 prefix
                email: 'invalid-email'  // Invalid email format
            },
            start_date: '2024-01-19',
            start_time: '11:00',
            location: { name: 'Magic Hub Test' },
            status: 'new'
        },
        expectedResult: 'WARNING'
    }
];

// ===== 🔬 VALIDATION FUNCTIONS =====

async function runDataStructureValidation() {
    console.log('🔍 STARTING DATA STRUCTURE VALIDATION...');
    console.log('🎯 Testing 2 main error sources...');
    
    const results = [];
    
    for (const scenario of testAppointmentScenarios) {
        console.log(`\n🧪 Testing: ${scenario.name}`);
        console.log('📥 Input data:', scenario.data);
        
        try {
            const validation = N8NIntegrationService.validateAppointmentData(
                scenario.data, 
                `test_${scenario.name}`
            );
            
            const actualResult = validation.isValid ? 'PASS' : 
                                validation.errors.length > 0 ? 'FAIL' : 'WARNING';
            
            console.log(`📊 Result: ${actualResult} (Expected: ${scenario.expectedResult})`);
            console.log(`🚨 Errors: ${validation.errors.length}`);
            console.log(`⚠️ Warnings: ${validation.warnings.length}`);
            
            if (validation.cleanedData) {
                console.log('🧹 Cleaned data:', validation.cleanedData);
            }
            
            results.push({
                scenario: scenario.name,
                expected: scenario.expectedResult,
                actual: actualResult,
                passed: actualResult === scenario.expectedResult,
                validation
            });
            
        } catch (error) {
            console.error(`❌ Test failed: ${error.message}`);
            results.push({
                scenario: scenario.name,
                expected: scenario.expectedResult,
                actual: 'ERROR',
                passed: false,
                error: error.message
            });
        }
    }
    
    return results;
}

async function runAssumptionValidation() {
    console.log('\n🎯 VALIDATING CRITICAL ASSUMPTIONS...');
    
    try {
        const assumptionResults = await N8NIntegrationService.validateCriticalAssumptions();
        
        console.log('📝 Customer Name Structure Tests:');
        assumptionResults['Customer Name Structure'].forEach((test, index) => {
            console.log(`  Test ${index + 1}:`, test.input, '→', test.analysis);
        });
        
        console.log('📅 Date/Time Field Detection Tests:');
        assumptionResults['Date/Time Field Detection'].forEach((test, index) => {
            console.log(`  Test ${index + 1}:`, test.input, '→', test.analysis);
        });
        
        return assumptionResults;
        
    } catch (error) {
        console.error('❌ Assumption validation failed:', error);
        return { error: error.message };
    }
}

async function runSystemConnectivityTest() {
    console.log('\n🌐 TESTING SYSTEM CONNECTIVITY...');
    
    try {
        const systemValidation = await N8NIntegrationService.runFullSystemValidation();
        
        console.log('📊 SYSTEM VALIDATION SUMMARY:');
        console.log(`✅ Passed Tests: ${systemValidation.summary.passedTests.length}`);
        console.log(`⚠️ Warnings: ${systemValidation.summary.warnings.length}`);
        console.log(`🚨 Critical Issues: ${systemValidation.summary.criticalIssues.length}`);
        
        if (systemValidation.summary.criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES FOUND:');
            systemValidation.summary.criticalIssues.forEach(issue => {
                console.log(`  ❌ ${issue}`);
            });
        }
        
        if (systemValidation.summary.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            systemValidation.summary.warnings.forEach(warning => {
                console.log(`  ⚠️ ${warning}`);
            });
        }
        
        return systemValidation;
        
    } catch (error) {
        console.error('❌ System validation failed:', error);
        return { error: error.message };
    }
}

// ===== 🚀 MAIN TEST RUNNER =====

async function runAllValidationTests() {
    console.log('🧪 MAGIC HUB N8N INTEGRATION - FULL VALIDATION TEST');
    console.log('🎯 Checking for 2 main error sources...');
    console.log('=' .repeat(80));
    
    const startTime = performance.now();
    
    try {
        // Test 1: Data Structure Validation (EROARE #1)
        const dataStructureResults = await runDataStructureValidation();
        
        // Test 2: Assumptions Validation
        const assumptionResults = await runAssumptionValidation();
        
        // Test 3: System Connectivity (EROARE #2)
        const systemResults = await runSystemConnectivityTest();
        
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        // Final Summary
        console.log('\n' + '=' .repeat(80));
        console.log('📊 FINAL VALIDATION SUMMARY');
        console.log('=' .repeat(80));
        
        const passedDataTests = dataStructureResults.filter(r => r.passed).length;
        const totalDataTests = dataStructureResults.length;
        
        console.log(`🔍 Data Structure Tests: ${passedDataTests}/${totalDataTests} passed`);
        console.log(`🎯 Assumptions Validated: ${Object.keys(assumptionResults).length}`);
        console.log(`🌐 System Tests: ${systemResults.summary?.passedTests?.length || 0} passed`);
        console.log(`⏱️ Total Duration: ${duration}ms`);
        
        // Critical Issues Summary
        const criticalIssues = [];
        
        dataStructureResults.forEach(result => {
            if (!result.passed) {
                criticalIssues.push(`Data Test Failed: ${result.scenario}`);
            }
        });
        
        if (systemResults.summary?.criticalIssues) {
            criticalIssues.push(...systemResults.summary.criticalIssues);
        }
        
        if (criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES TO FIX:');
            criticalIssues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        } else {
            console.log('\n✅ ALL VALIDATION TESTS PASSED!');
        }
        
        // Export results for detailed analysis
        const exportData = {
            timestamp: new Date().toISOString(),
            duration,
            dataStructureResults,
            assumptionResults,
            systemResults,
            criticalIssues
        };
        
        console.log('\n💾 Exporting validation results...');
        N8NIntegrationService.storeDebugLog({
            timestamp: exportData.timestamp,
            type: 'FULL_VALIDATION_TEST',
            results: exportData
        });
        
        return exportData;
        
    } catch (error) {
        console.error('🚨 VALIDATION TEST SUITE FAILED:', error);
        throw error;
    }
}

// ===== 🎮 USAGE EXAMPLES =====

console.log(`
🧪 MAGIC HUB VALIDATION TEST COMMANDS:

// Run complete validation suite
runAllValidationTests().then(results => console.log('✅ Done:', results));

// Test only data structure validation  
runDataStructureValidation().then(results => console.log('📊 Data tests:', results));

// Test only assumptions
runAssumptionValidation().then(results => console.log('🎯 Assumptions:', results));

// Test only system connectivity
runSystemConnectivityTest().then(results => console.log('🌐 System:', results));

// Export all logs for detailed analysis
N8NIntegrationService.exportDebugLogs();

// View logs in console
N8NIntegrationService.viewDebugLogs();
`);

// Export functions for use in browser console or React app
if (typeof window !== 'undefined') {
    window.MagicHubValidation = {
        runAllValidationTests,
        runDataStructureValidation,
        runAssumptionValidation,
        runSystemConnectivityTest,
        N8NIntegrationService
    };
    
    console.log('🎮 Validation tools loaded! Access via window.MagicHubValidation');
}

export {
    runAllValidationTests,
    runDataStructureValidation,
    runAssumptionValidation,
    runSystemConnectivityTest
}; 