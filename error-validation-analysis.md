import axios from 'axios';

/**
 * Enhanced N8N Integration Service cu validare și logging extensiv
 */
class N8NIntegrationService {
    static baseURL = process.env.REACT_APP_N8N_WEBHOOK_URL || 'https://n8n.magichub.ro/webhook';
    static retryAttempts = 3;
    static retryDelay = 1000;
    static debugMode = process.env.NODE_ENV === 'development';

    // ===== VALIDATION & LOGGING METHODS =====

    /**
     * Validează structura datelor appointment ÎNAINTE de trimitere către N8N
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
                const phoneValid = this.validatePhone(appointmentData.customer.phone);
                if (!phoneValid) {
                    warnings.push(`WARNING: phone format suspicious: ${appointmentData.customer.phone}`);
                    console.warn('⚠️ Phone format may be invalid');
                }
            }
            
            // Verifică email
            if (!appointmentData.customer.email) {
                warnings.push('WARNING: customer.email missing - email notifications disabled');
                console.warn('⚠️ No email provided');
            } else {
                const emailValid = this.validateEmail(appointmentData.customer.email);
                if (!emailValid) {
                    warnings.push(`WARNING: email format invalid: ${appointmentData.customer.email}`);
                    console.warn('⚠️ Email format invalid');
                }
            }
            
            // Analizează structura numelui
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
        
        // Verifică location
        console.log('📍 ANALYZING LOCATION STRUCTURE...');
        const locationAnalysis = this.analyzeLocationStructure(appointmentData);
        console.log('🏢 LOCATION ANALYSIS:', locationAnalysis);
        
        if (!locationAnalysis.hasValidLocation) {
            warnings.push('WARNING: No location information available');
            console.warn('⚠️ No location data found');
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
        this.logValidationResult(source, { appointmentData, errors, warnings, cleanedData, timestamp });
        
        return { isValid, errors, warnings, cleanedData };
    }
    
    /**
     * Analizează structura numelui
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
     * Analizează structura date/time
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
     * Analizează structura location
     */
    static analyzeLocationStructure(appointmentData) {
        const hasLocationObject = appointmentData.location && typeof appointmentData.location === 'object';
        const hasLocationString = appointmentData.location && typeof appointmentData.location === 'string';
        const hasLocationName = hasLocationObject && appointmentData.location.name;
        
        return {
            hasValidLocation: hasLocationString || hasLocationName,
            structure: hasLocationObject ? 'object' : hasLocationString ? 'string' : 'none',
            value: hasLocationName ? appointmentData.location.name : 
                   hasLocationString ? appointmentData.location : null
        };
    }
    
    /**
     * Validare simplă telefon
     */
    static validatePhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        // Basic validation - should start with + and have 10-15 digits
        const phoneRegex = /^\+\d{10,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }
    
    /**
     * Validare simplă email
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Curăță și standardizează datele pentru N8N
     */
    static cleanAppointmentData(appointmentData) {
        const nameAnalysis = this.analyzeNameStructure(appointmentData.customer);
        const dateTimeAnalysis = this.analyzeDateTimeStructure(appointmentData);
        const locationAnalysis = this.analyzeLocationStructure(appointmentData);
        
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
            location: locationAnalysis.value || '',
            appointment_id: appointmentData.id || `temp_${Date.now()}`,
            status: appointmentData.status || 'new'
        };
        
        console.log('🧹 FINAL CLEANED DATA:', cleaned);
        return cleaned;
    }
    
    /**
     * Stochează rezultatele validării pentru debugging
     */
    static logValidationResult(source, validationData) {
        const logEntry = {
            timestamp: validationData.timestamp,
            source,
            type: 'VALIDATION',
            hasErrors: validationData.errors.length > 0,
            errorCount: validationData.errors.length,
            warningCount: validationData.warnings.length,
            errors: validationData.errors,
            warnings: validationData.warnings,
            rawData: validationData.appointmentData,
            cleanedData: validationData.cleanedData
        };
        
        this.storeDebugLog(logEntry);
    }
    
    /**
     * Enhanced trigger pentru booking confirmation cu validare completă
     */
    static async triggerBookingConfirmation(appointmentData, source = 'unknown') {
        console.log(`🚀 TRIGGERING BOOKING CONFIRMATION FROM: ${source}`);
        
        // Validare comprehensivă
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
     * Enhanced call webhook cu logging extensiv
     */
    static async callWebhook(endpoint, data, workflowName = 'Unknown') {
        const url = `${this.baseURL}${endpoint}`;
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.group(`🌐 [${requestId}] CALLING N8N WEBHOOK: ${workflowName}`);
        console.log('📤 URL:', url);
        console.log('📦 PAYLOAD:', data);
        
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
                console.log(`🔄 Attempt ${attempt}/${this.retryAttempts}`);
                
                const response = await axios.post(url, data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'MagicHub-Frontend/1.0',
                        'X-Request-ID': requestId
                    },
                    timeout: 10000
                });
                
                console.log('✅ SUCCESS Response:', response.data);
                console.log('📊 Status:', response.status, response.statusText);
                console.groupEnd();
                
                // Log success
                this.storeDebugLog({
                    ...logEntry,
                    type: 'WEBHOOK_SUCCESS',
                    attempt,
                    responseStatus: response.status,
                    responseData: response.data,
                    duration: Date.now() - new Date(logEntry.timestamp).getTime()
                });
                
                return {
                    success: true,
                    data: response.data,
                    workflow: workflowName,
                    endpoint,
                    requestId
                };
                
            } catch (error) {
                console.error(`❌ Attempt ${attempt} FAILED:`, {
                    message: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    responseData: error.response?.data
                });
                
                // Log failed attempt
                this.storeDebugLog({
                    ...logEntry,
                    type: 'WEBHOOK_ERROR',
                    attempt,
                    error: error.message,
                    errorStatus: error.response?.status,
                    errorData: error.response?.data,
                    duration: Date.now() - new Date(logEntry.timestamp).getTime()
                });
                
                if (attempt === this.retryAttempts) {
                    console.groupEnd();
                    const finalError = new Error(`N8N ${workflowName} failed after ${this.retryAttempts} attempts: ${error.message}`);
                    
                    // Log final failure
                    this.storeDebugLog({
                        ...logEntry,
                        type: 'WEBHOOK_FINAL_FAILURE',
                        finalError: finalError.message
                    });
                    
                    throw finalError;
                }
                
                // Wait before retry with exponential backoff
                const waitTime = this.retryDelay * Math.pow(2, attempt - 1);
                console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
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
    
    /**
     * Exportă log-uri pentru debugging
     */
    static exportDebugLogs() {
        const logs = JSON.parse(localStorage.getItem('magichub_n8n_debug_logs') || '[]');
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `magichub-n8n-debug-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('📁 Debug logs exported');
    }
    
    /**
     * Testează conectivitatea N8N și toate workflow-urile
     */
    static async runFullSystemValidation() {
        console.log('🔬 STARTING FULL SYSTEM VALIDATION...');
        
        const results = {
            timestamp: new Date().toISOString(),
            connectivity: null,
            workflows: [],
            dataStructure: null
        };
        
        // Test connectivity
        try {
            results.connectivity = await this.checkConnection();
            console.log('🌐 Connectivity test:', results.connectivity);
        } catch (error) {
            results.connectivity = { connected: false, error: error.message };
        }
        
        // Test each workflow with sample data
        const testAppointment = {
            id: 'test_123',
            customer: {
                firstname: 'Test',
                lastname: 'Client',
                phone: '+40123456789',
                email: 'test@magichub.ro'
            },
            start_date: '2024-01-15',
            start_time: '10:00',
            location: { name: 'Magic Hub Test' },
            status: 'new'
        };
        
        // Validate data structure
        results.dataStructure = this.validateAppointmentData(testAppointment, 'system_validation');
        
        console.log('📊 FULL VALIDATION RESULTS:', results);
        
        this.storeDebugLog({
            timestamp: results.timestamp,
            type: 'FULL_SYSTEM_VALIDATION',
            results
        });
        
        return results;
    }
}

export default N8NIntegrationService; 