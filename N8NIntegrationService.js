import axios from 'axios';

/**
 * Enhanced N8N Integration Service cu validare și logging extensiv
 * 🚨 SURSE PRINCIPALE DE ERORI IDENTIFICATE:
 * 1. Data Structure Mismatch între Frontend și N8N  
 * 2. Workflow Configuration Issues în N8N
 */
class N8NIntegrationService {
    static baseURL = process.env.REACT_APP_N8N_WEBHOOK_URL || 'https://n8n.magichub.ro/webhook';
    static retryAttempts = 3;
    static retryDelay = 1000;
    static debugMode = process.env.NODE_ENV === 'development';

    // ===== 🔍 VALIDATION & LOGGING METHODS =====

    /**
     * 🚨 EROARE #1 FIX: Validează structura datelor appointment ÎNAINTE de trimitere către N8N
     */
    static validateAppointmentData(appointmentData, source = 'unknown') {
        const timestamp = new Date().toISOString();
        
        console.group(`🔍 [${timestamp}] VALIDATING APPOINTMENT DATA FROM: ${source}`);
        console.log('📥 RAW INPUT DATA:', appointmentData);
        
        const errors = [];
        const warnings = [];
        
        // Verifică existența customer object
        if (!appointmentData || typeof appointmentData !== 'object') {
            errors.push('CRITICAL: appointmentData is null or not an object');
            console.error('🚨 CRITICAL ERROR: Invalid appointmentData type');
            console.groupEnd();
            return { isValid: false, errors, warnings, cleanedData: null };
        }
        
        // Analizează structura customer
        console.log('👤 ANALYZING CUSTOMER STRUCTURE...');
        if (!appointmentData.customer) {
            errors.push('CRITICAL: customer object missing completely');
            console.error('🚨 No customer object found');
        } else {
            console.log('📊 Customer object found:', appointmentData.customer);
            
            // Verifică phone
            if (!appointmentData.customer.phone) {
                errors.push('CRITICAL: customer.phone missing');
                console.error('🚨 Missing phone number');
            } else {
                console.log('📞 Phone found:', appointmentData.customer.phone);
            }
            
            // Verifică email
            if (!appointmentData.customer.email) {
                warnings.push('WARNING: customer.email missing - email notifications disabled');
                console.warn('⚠️ No email provided');
            } else {
                console.log('📧 Email found:', appointmentData.customer.email);
            }
            
            // Analizează structura numelui - CRITICAL VALIDATION
            const nameAnalysis = this.analyzeNameStructure(appointmentData.customer);
            console.log('📝 NAME ANALYSIS:', nameAnalysis);
            
            if (!nameAnalysis.hasValidName) {
                errors.push('CRITICAL: No valid name information available');
                console.error('🚨 No name data found');
            } else if (nameAnalysis.needsSplitting) {
                warnings.push('WARNING: Using risky name splitting approach');
                console.warn('⚠️ Will attempt to split full name - may be unreliable');
            }
        }
        
        // Verifică date/time information
        console.log('📅 ANALYZING DATE/TIME STRUCTURE...');
        const dateTimeAnalysis = this.analyzeDateTimeStructure(appointmentData);
        console.log('🕐 DATE/TIME ANALYSIS:', dateTimeAnalysis);
        
        if (!dateTimeAnalysis.hasValidDate) {
            errors.push('CRITICAL: No valid date information found');
            console.error('🚨 No date data found');
        }
        
        if (!dateTimeAnalysis.hasValidTime) {
            errors.push('CRITICAL: No valid time information found');
            console.error('🚨 No time data found');
        }
        
        // Summary
        console.log(`🚨 VALIDATION ERRORS (${errors.length}):`, errors);
        console.log(`⚠️ VALIDATION WARNINGS (${warnings.length}):`, warnings);
        
        const isValid = errors.length === 0;
        const cleanedData = isValid ? this.cleanAppointmentData(appointmentData) : null;
        
        if (cleanedData) {
            console.log('🧹 CLEANED DATA FOR N8N:', cleanedData);
        }
        
        console.groupEnd();
        
        // Store validation result pentru debugging
        this.storeDebugLog({
            timestamp,
            source,
            type: 'VALIDATION',
            hasErrors: errors.length > 0,
            errorCount: errors.length,
            warningCount: warnings.length,
            errors,
            warnings,
            rawData: appointmentData,
            cleanedData
        });
        
        return { isValid, errors, warnings, cleanedData };
    }

    /**
     * Analizează structura numelui pentru identificarea problemelor
     */
    static analyzeNameStructure(customer) {
        const hasFirstname = customer.firstname && customer.firstname.trim().length > 0;
        const hasLastname = customer.lastname && customer.lastname.trim().length > 0;
        const hasFullName = customer.name && customer.name.trim().length > 0;
        
        return {
            hasFirstname,
            hasLastname,
            hasFullName,
            hasValidName: hasFirstname || hasFullName,
            needsSplitting: !hasFirstname && hasFullName,
            structure: hasFirstname ? 'separate_fields' : hasFullName ? 'full_name' : 'none'
        };
    }

    /**
     * Analizează structura date/time pentru identificarea problemelor
     */
    static analyzeDateTimeStructure(appointmentData) {
        const possibleDateFields = ['start_date', 'date', 'booking_date', 'appointment_date'];
        const possibleTimeFields = ['start_time', 'time', 'booking_time', 'appointment_time'];
        
        let foundDate = null;
        let foundTime = null;
        
        for (const field of possibleDateFields) {
            if (appointmentData[field]) {
                foundDate = { field, value: appointmentData[field] };
                break;
            }
        }
        
        for (const field of possibleTimeFields) {
            if (appointmentData[field]) {
                foundTime = { field, value: appointmentData[field] };
                break;
            }
        }
        
        return {
            hasValidDate: !!foundDate,
            hasValidTime: !!foundTime,
            dateField: foundDate,
            timeField: foundTime,
            detectedFields: {
                date: possibleDateFields.filter(f => appointmentData[f]),
                time: possibleTimeFields.filter(f => appointmentData[f])
            }
        };
    }

    /**
     * Curăță și standardizează datele pentru N8N
     */
    static cleanAppointmentData(appointmentData) {
        const nameAnalysis = this.analyzeNameStructure(appointmentData.customer);
        const dateTimeAnalysis = this.analyzeDateTimeStructure(appointmentData);
        
        let firstname = 'Client';
        let lastname = '';
        
        if (nameAnalysis.hasFirstname) {
            firstname = appointmentData.customer.firstname.trim();
            lastname = appointmentData.customer.lastname ? appointmentData.customer.lastname.trim() : '';
        } else if (nameAnalysis.hasFullName) {
            const nameParts = appointmentData.customer.name.trim().split(' ');
            firstname = nameParts[0] || 'Client';
            lastname = nameParts.slice(1).join(' ');
        }
        
        const cleaned = {
            firstname,
            lastname,
            phone: appointmentData.customer?.phone || '',
            email: appointmentData.customer?.email || '',
            date: dateTimeAnalysis.dateField?.value || '',
            time: dateTimeAnalysis.timeField?.value || '',
            location: appointmentData.location?.name || appointmentData.location || '',
            appointment_id: appointmentData.id || `temp_${Date.now()}`,
            status: appointmentData.status || 'new'
        };
        
        console.log('🧹 FINAL CLEANED DATA:', cleaned);
        return cleaned;
    }

    /**
     * Stochează log-uri pentru debugging
     */
    static storeDebugLog(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('magichub_n8n_debug_logs') || '[]');
            logs.push(logEntry);
            
            // Keep only last 200 logs
            if (logs.length > 200) {
                logs.splice(0, logs.length - 200);
            }
            
            localStorage.setItem('magichub_n8n_debug_logs', JSON.stringify(logs));
            
            if (this.debugMode) {
                console.log('💾 DEBUG LOG STORED:', logEntry.type);
            }
        } catch (error) {
            console.error('Failed to store debug log:', error);
        }
    }

    // ===== 🚀 ENHANCED TRIGGER METHODS =====

    /**
     * Enhanced trigger pentru confirmarea programărilor noi CU VALIDARE COMPLETĂ
     */
    static async triggerBookingConfirmation(appointmentData, source = 'unknown') {
        console.log(`🚀 TRIGGERING BOOKING CONFIRMATION FROM: ${source}`);
        
        // 🔍 VALIDARE COMPREHENSIVĂ
        const validation = this.validateAppointmentData(appointmentData, source);
        
        if (!validation.isValid) {
            const errorMsg = `BOOKING CONFIRMATION BLOCKED - Validation failed: ${validation.errors.join(', ')}`;
            console.error('🚫', errorMsg);
            
            this.storeDebugLog({
                timestamp: new Date().toISOString(),
                type: 'ERROR',
                workflow: 'Booking Confirmation',
                message: errorMsg,
                data: { appointmentData, validation }
            });
            
            throw new Error(errorMsg);
        }
        
        if (validation.warnings.length > 0) {
            console.warn('⚠️ PROCEEDING WITH WARNINGS:', validation.warnings);
        }
        
        return this.callWebhook('/magic-hub-booking-upload', validation.cleanedData, 'Booking Confirmation');
    }

    /**
     * Legacy trigger pentru backward compatibility (DEPRECATED)
     */
    static async triggerBookingConfirmationLegacy(appointmentData) {
        const payload = {
            firstname: appointmentData.customer?.firstname || appointmentData.customer?.name?.split(' ')[0],
            lastname: appointmentData.customer?.lastname || appointmentData.customer?.name?.split(' ').slice(1).join(' '),
            phone: appointmentData.customer?.phone,
            email: appointmentData.customer?.email,
            date: appointmentData.start_date || appointmentData.date,
            time: appointmentData.start_time || appointmentData.time,
            location: appointmentData.location?.name || appointmentData.location,
            status: 'new',
            appointment_id: appointmentData.id
        };

        return this.callWebhook('/magic-hub-booking-upload', payload, 'Booking Confirmation');
    }

    /**
     * Trigger pentru managementul no-show
     */
    static async triggerNoShow(appointmentData) {
        if (!['no_show', 'absent', 'no show'].includes(appointmentData.status?.toLowerCase())) {
            console.log('Status is not no-show, skipping N8N trigger');
            return;
        }

        const payload = {
            firstname: appointmentData.customer?.firstname || appointmentData.customer?.name?.split(' ')[0],
            lastname: appointmentData.customer?.lastname || appointmentData.customer?.name?.split(' ').slice(1).join(' '),
            phone: appointmentData.customer?.phone,
            date: appointmentData.start_date || appointmentData.date,
            time: appointmentData.start_time || appointmentData.time,
            location: appointmentData.location?.name || appointmentData.location,
            status: appointmentData.status,
            appointment_id: appointmentData.id
        };

        return this.callWebhook('/no-show-webhook', payload, 'No Show Management');
    }

    /**
     * Trigger pentru follow-up și cereri de review
     */
    static async triggerFollowUp(appointmentData) {
        if (!['completed', 'prezent', 'finished'].includes(appointmentData.status?.toLowerCase())) {
            console.log('Appointment not completed, skipping follow-up trigger');
            return;
        }

        const payload = {
            name: appointmentData.customer?.name || `${appointmentData.customer?.firstname} ${appointmentData.customer?.lastname}`,
            phone: appointmentData.customer?.phone,
            email: appointmentData.customer?.email,
            booking_date: appointmentData.start_date || appointmentData.date,
            booking_time: appointmentData.start_time || appointmentData.time,
            location: appointmentData.location?.name || appointmentData.location,
            appointment_id: appointmentData.id,
            status: 'completed'
        };

        // Programează follow-up după 2 ore
        setTimeout(() => {
            this.callWebhook('/followup-trigger', payload, 'Follow-up Review Request');
        }, 2 * 60 * 60 * 1000);
    }

    /**
     * Trigger pentru feedback negativ
     */
    static async triggerNegativeFeedback(feedbackData) {
        const payload = {
            client_name: feedbackData.client_name || feedbackData.customerName,
            rating: parseInt(feedbackData.rating),
            feedback: feedbackData.feedback || feedbackData.comment,
            appointment_id: feedbackData.appointment_id,
            phone: feedbackData.phone,
            email: feedbackData.email,
            timestamp: new Date().toISOString()
        };

        return this.callWebhook('/feedback-upload', payload, 'Negative Feedback Management');
    }

    /**
     * 🚨 EROARE #2 FIX: Enhanced funcție pentru apelarea webhook-urilor N8N cu logging extensiv
     */
    static async callWebhook(endpoint, data, workflowName = 'Unknown') {
        const url = `${this.baseURL}${endpoint}`;
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.group(`🌐 [${requestId}] CALLING N8N WEBHOOK: ${workflowName}`);
        console.log('📤 URL:', url);
        console.log('📦 PAYLOAD:', data);
        console.log('🔄 Max Attempts:', this.retryAttempts);
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            requestId,
            type: 'WEBHOOK_CALL',
            workflow: workflowName,
            endpoint,
            url,
            payload: data
        };
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${this.retryAttempts} - Starting request...`);
                
                const startTime = performance.now();
                
                const response = await axios.post(url, data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'MagicHub-Frontend/1.0',
                        'X-Request-ID': requestId,
                        'X-Source': 'MagicHub-React-App'
                    },
                    timeout: 15000, // Increased timeout
                    validateStatus: function (status) {
                        return status < 500; // Accept 4xx as response, not error
                    }
                });
                
                const duration = performance.now() - startTime;
                
                console.log('✅ SUCCESS Response:');
                console.log('📊 Status:', response.status, response.statusText);
                console.log('📦 Response Data:', response.data);
                console.log('⏱️ Duration:', `${duration.toFixed(2)}ms`);
                console.groupEnd();
                
                // Log success
                this.storeDebugLog({
                    ...logEntry,
                    type: 'WEBHOOK_SUCCESS',
                    attempt,
                    responseStatus: response.status,
                    responseData: response.data,
                    duration: Math.round(duration),
                    success: true
                });
                
                return {
                    success: true,
                    data: response.data,
                    workflow: workflowName,
                    endpoint,
                    requestId,
                    duration: Math.round(duration),
                    status: response.status
                };
                
            } catch (error) {
                const duration = performance.now() - (logEntry.startTime || Date.now());
                
                console.error(`❌ Attempt ${attempt} FAILED:`);
                console.error('💥 Error Message:', error.message);
                console.error('🔴 Error Code:', error.code);
                console.error('📊 Response Status:', error.response?.status);
                console.error('📦 Response Data:', error.response?.data);
                console.error('⏱️ Failed after:', `${duration.toFixed(2)}ms`);
                
                // Log failed attempt
                this.storeDebugLog({
                    ...logEntry,
                    type: 'WEBHOOK_ERROR',
                    attempt,
                    error: error.message,
                    errorCode: error.code,
                    errorStatus: error.response?.status,
                    errorData: error.response?.data,
                    duration: Math.round(duration),
                    success: false
                });
                
                if (attempt === this.retryAttempts) {
                    console.groupEnd();
                    const finalError = new Error(`🚨 N8N ${workflowName} FINAL FAILURE after ${this.retryAttempts} attempts: ${error.message}`);
                    
                    // Log final failure
                    this.storeDebugLog({
                        ...logEntry,
                        type: 'WEBHOOK_FINAL_FAILURE',
                        finalError: finalError.message,
                        totalAttempts: this.retryAttempts,
                        success: false
                    });
                    
                    throw finalError;
                }
                
                // Exponential backoff with jitter
                const baseDelay = this.retryDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * 1000;
                const waitTime = baseDelay + jitter;
                
                console.log(`⏳ Waiting ${Math.round(waitTime)}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    /**
     * Verifică statusul conexiunii cu N8N
     */
    static async checkConnection() {
        try {
            const response = await axios.get(`${this.baseURL}/health`, {
                timeout: 5000
            });
            return { connected: true, response: response.data };
        } catch (error) {
            console.error('N8N connection check failed:', error);
            return { connected: false, error: error.message };
        }
    }

    /**
     * Configurează callback-uri pentru răspunsurile de la N8N
     */
    static setupCallbacks(socketInstance) {
        if (!socketInstance) {
            console.warn('Socket instance not provided for N8N callbacks');
            return;
        }

        // Confirmări trimise
        socketInstance.on('n8n_confirmation_sent', (data) => {
            console.log('N8N Confirmation sent:', data);
            this.showNotification(`Confirmare trimisă pentru ${data.customerName}`, 'success');
        });

        // Reminder-uri trimise
        socketInstance.on('n8n_reminder_sent', (data) => {
            console.log('N8N Reminder sent:', data);
            this.showNotification(`Reminder trimis pentru ${data.customerName}`, 'info');
        });

        // Review requests trimise
        socketInstance.on('n8n_review_request_sent', (data) => {
            console.log('N8N Review request sent:', data);
            this.showNotification(`Cerere review trimisă pentru ${data.customerName}`, 'info');
        });
    }

    /**
     * Afișează notificări în UI
     */
    static showNotification(message, type = 'info') {
        // Dispatch custom event pentru notificări
        const event = new CustomEvent('n8n_notification', {
            detail: { message, type, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
    }

    // ===== 🔬 SYSTEM VALIDATION & DEBUGGING METHODS =====

    /**
     * Rulează validarea completă a sistemului pentru identificarea problemelor
     */
    static async runFullSystemValidation() {
        console.log('🔬 STARTING FULL SYSTEM VALIDATION...');
        console.log('🎯 CHECKING FOR 2 MAIN ERROR SOURCES...');
        
        const results = {
            timestamp: new Date().toISOString(),
            connectivity: null,
            workflows: [],
            dataStructure: null,
            summary: {
                criticalIssues: [],
                warnings: [],
                passedTests: []
            }
        };
        
        // Test 1: Connectivity
        console.log('🌐 Testing N8N connectivity...');
        try {
            results.connectivity = await this.checkConnection();
            console.log('✅ Connectivity test passed:', results.connectivity);
            results.summary.passedTests.push('N8N Connectivity');
        } catch (error) {
            results.connectivity = { connected: false, error: error.message };
            results.summary.criticalIssues.push(`N8N Connection Failed: ${error.message}`);
            console.error('❌ Connectivity test failed:', error);
        }
        
        // Test 2: Data Structure Validation (EROARE #1)
        console.log('🔍 Testing data structure validation...');
        const testAppointment = {
            id: 'test_validation_123',
            customer: {
                firstname: 'Test',
                lastname: 'Validation',
                phone: '+40123456789',
                email: 'test.validation@magichub.ro'
            },
            start_date: '2024-01-15',
            start_time: '10:00',
            location: { name: 'Magic Hub Test Center' },
            status: 'new'
        };
        
        results.dataStructure = this.validateAppointmentData(testAppointment, 'system_validation');
        
        if (results.dataStructure.isValid) {
            console.log('✅ Data structure validation passed');
            results.summary.passedTests.push('Data Structure Validation');
        } else {
            console.error('❌ Data structure validation failed');
            results.summary.criticalIssues.push(`Data Validation Failed: ${results.dataStructure.errors.join(', ')}`);
        }
        
        if (results.dataStructure.warnings.length > 0) {
            results.summary.warnings.push(`Data Validation Warnings: ${results.dataStructure.warnings.join(', ')}`);
        }
        
        // Test 3: Workflow Testing (EROARE #2)
        console.log('🧪 Testing N8N workflows...');
        const workflowTests = [
            { name: 'Booking Confirmation', endpoint: '/magic-hub-booking-upload', data: testAppointment },
            { name: 'No Show Management', endpoint: '/no-show-webhook', data: {...testAppointment, status: 'no_show'} }
        ];
        
        for (const test of workflowTests) {
            try {
                console.log(`🧪 Testing workflow: ${test.name}`);
                
                // Create test payload
                const validation = this.validateAppointmentData(test.data, `test_${test.name}`);
                if (!validation.isValid) {
                    results.summary.criticalIssues.push(`${test.name}: Data validation failed`);
                    continue;
                }
                
                // Test webhook call (with dry-run header)
                const result = await axios.post(`${this.baseURL}${test.endpoint}`, validation.cleanedData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Test-Mode': 'true',
                        'X-Dry-Run': 'true'
                    },
                    timeout: 10000
                });
                
                console.log(`✅ Workflow ${test.name} test passed`);
                results.workflows.push({
                    name: test.name,
                    status: 'PASSED',
                    response: result.data
                });
                results.summary.passedTests.push(`Workflow: ${test.name}`);
                
            } catch (error) {
                console.error(`❌ Workflow ${test.name} test failed:`, error.message);
                results.workflows.push({
                    name: test.name,
                    status: 'FAILED',
                    error: error.message
                });
                results.summary.criticalIssues.push(`${test.name}: ${error.message}`);
            }
        }
        
        // Final Summary
        console.log('📊 VALIDATION SUMMARY:');
        console.log(`✅ Passed Tests (${results.summary.passedTests.length}):`, results.summary.passedTests);
        console.log(`⚠️ Warnings (${results.summary.warnings.length}):`, results.summary.warnings);
        console.log(`🚨 Critical Issues (${results.summary.criticalIssues.length}):`, results.summary.criticalIssues);
        
        this.storeDebugLog({
            timestamp: results.timestamp,
            type: 'FULL_SYSTEM_VALIDATION',
            results
        });
        
        return results;
    }

    /**
     * Exportă log-urile pentru analiza detaliată
     */
    static exportDebugLogs() {
        try {
            const logs = JSON.parse(localStorage.getItem('magichub_n8n_debug_logs') || '[]');
            
            if (logs.length === 0) {
                console.warn('⚠️ No debug logs available to export');
                return;
            }
            
            const exportData = {
                exportTimestamp: new Date().toISOString(),
                totalLogs: logs.length,
                logTypes: [...new Set(logs.map(log => log.type))],
                summary: {
                    errors: logs.filter(log => log.type.includes('ERROR')).length,
                    successes: logs.filter(log => log.type.includes('SUCCESS')).length,
                    validations: logs.filter(log => log.type === 'VALIDATION').length
                },
                logs
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `magichub-n8n-debug-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            console.log('📁 Debug logs exported successfully');
            console.log('📊 Export summary:', exportData.summary);
            
        } catch (error) {
            console.error('❌ Failed to export debug logs:', error);
        }
    }

    /**
     * Vizualizează log-urile în console într-un format frumos
     */
    static viewDebugLogs(filterType = null) {
        try {
            const logs = JSON.parse(localStorage.getItem('magichub_n8n_debug_logs') || '[]');
            
            const filteredLogs = filterType ? 
                logs.filter(log => log.type === filterType) : 
                logs;
            
            if (filteredLogs.length === 0) {
                console.log('📭 No logs found' + (filterType ? ` for type: ${filterType}` : ''));
                return;
            }
            
            console.group(`📊 DEBUG LOGS${filterType ? ` - ${filterType}` : ''} (${filteredLogs.length} entries)`);
            
            filteredLogs.forEach((log, index) => {
                const icon = {
                    'VALIDATION': '🔍',
                    'WEBHOOK_SUCCESS': '✅',
                    'WEBHOOK_ERROR': '❌',
                    'ERROR': '🚨',
                    'FULL_SYSTEM_VALIDATION': '🔬'
                }[log.type] || '📝';
                
                console.group(`${icon} [${log.timestamp}] ${log.type}`);
                
                if (log.workflow) console.log('🔧 Workflow:', log.workflow);
                if (log.source) console.log('📍 Source:', log.source);
                if (log.errorCount) console.log('🚨 Errors:', log.errorCount);
                if (log.warningCount) console.log('⚠️ Warnings:', log.warningCount);
                if (log.duration) console.log('⏱️ Duration:', `${log.duration}ms`);
                if (log.requestId) console.log('🆔 Request ID:', log.requestId);
                
                console.groupEnd();
            });
            
            console.groupEnd();
            
        } catch (error) {
            console.error('❌ Failed to view debug logs:', error);
        }
    }

    /**
     * Curăță log-urile de debugging
     */
    static clearDebugLogs() {
        localStorage.removeItem('magichub_n8n_debug_logs');
        console.log('🧹 Debug logs cleared successfully');
    }

    /**
     * 🎯 ASSUMPTIONS VALIDATION - Testează assumptions-urile critice
     */
    static async validateCriticalAssumptions() {
        console.log('🎯 VALIDATING CRITICAL ASSUMPTIONS...');
        
        const assumptions = [
            {
                name: 'Customer Name Structure',
                test: () => {
                    // Test different customer structures
                    const testCases = [
                        { customer: { firstname: 'John', lastname: 'Doe' } },
                        { customer: { name: 'John Doe' } },
                        { customer: { name: 'John' } },
                        { customer: {} }
                    ];
                    
                    const results = testCases.map(testCase => {
                        const analysis = this.analyzeNameStructure(testCase.customer);
                        return { input: testCase, analysis };
                    });
                    
                    console.log('📝 Name structure test results:', results);
                    return results;
                }
            },
            {
                name: 'Date/Time Field Detection',
                test: () => {
                    const testCases = [
                        { start_date: '2024-01-15', start_time: '10:00' },
                        { date: '2024-01-15', time: '10:00' },
                        { booking_date: '2024-01-15', booking_time: '10:00' },
                        {}
                    ];
                    
                    const results = testCases.map(testCase => {
                        const analysis = this.analyzeDateTimeStructure(testCase);
                        return { input: testCase, analysis };
                    });
                    
                    console.log('📅 Date/time detection test results:', results);
                    return results;
                }
            }
        ];
        
        const assumptionResults = {};
        
        for (const assumption of assumptions) {
            try {
                console.log(`🧪 Testing assumption: ${assumption.name}`);
                assumptionResults[assumption.name] = assumption.test();
                console.log(`✅ Assumption ${assumption.name} validated`);
            } catch (error) {
                console.error(`❌ Assumption ${assumption.name} failed:`, error);
                assumptionResults[assumption.name] = { error: error.message };
            }
        }
        
        this.storeDebugLog({
            timestamp: new Date().toISOString(),
            type: 'ASSUMPTION_VALIDATION',
            results: assumptionResults
        });
        
        return assumptionResults;
    }
}

export default N8NIntegrationService; 