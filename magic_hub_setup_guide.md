# Magic Hub Salon Automation - Complete Setup Guide

## 🚀 PRODUCTION-READY WORKFLOW DEPLOYMENT

### 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] n8n instance version 0.229+ or newer
- [ ] All required service accounts created
- [ ] API keys and credentials obtained
- [ ] Google Sheets templates prepared
- [ ] Webhook URLs configured
- [ ] Environment variables set

---

## 🔑 REQUIRED CREDENTIALS & CONFIGURATIONS

### 1. **WhatsApp Business API (360Dialog)**
```json
{
  "name": "whatsapp360dialog",
  "type": "httpHeaderAuth", 
  "credentials": {
    "name": "D360-API-KEY",
    "value": "YOUR_360DIALOG_API_KEY"
  }
}
```

**Environment Variable:**
```
WHATSAPP_API_KEY=your_360dialog_api_key
```

### 2. **Gmail API Configuration**
```json
{
  "name": "gmail",
  "type": "googleOAuth2",
  "credentials": {
    "clientId": "YOUR_GOOGLE_CLIENT_ID",
    "clientSecret": "YOUR_GOOGLE_CLIENT_SECRET",
    "refreshToken": "YOUR_REFRESH_TOKEN",
    "accessToken": "YOUR_ACCESS_TOKEN"
  }
}
```

**Environment Variable:**
```
SENDER_EMAIL=noreply@magichub.ro
```

### 3. **Google Sheets API**
```json
{
  "name": "googleSheets",
  "type": "googleServiceAccount",
  "credentials": {
    "email": "service-account@project.iam.gserviceaccount.com",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  }
}
```

**Environment Variable:**
```
GOOGLE_SHEETS_ID=your_google_sheets_spreadsheet_id
```

### 4. **OpenAI API**
```json
{
  "name": "openAi",
  "type": "openAi",
  "credentials": {
    "apiKey": "YOUR_OPENAI_API_KEY"
  }
}
```

### 5. **Twilio (SMS Fallback)**
```json
{
  "name": "twilio",
  "type": "twilio",
  "credentials": {
    "accountSid": "YOUR_TWILIO_ACCOUNT_SID",
    "authToken": "YOUR_TWILIO_AUTH_TOKEN"
  }
}
```

---

## 📊 GOOGLE SHEETS SETUP

### Required Spreadsheet Structure:

#### Sheet 1: "Booking_Confirmations"
| Column | Data Type | Description |
|--------|-----------|-------------|
| name | Text | Client full name |
| phone | Text | Phone number (+40...) |
| email | Text | Email address |
| booking_date | Date | YYYY-MM-DD format |
| booking_time | Time | HH:MM format |
| location | Text | Salon location |
| whatsapp_sent | Boolean | TRUE/FALSE |
| email_sent | Boolean | TRUE/FALSE |
| timestamp | DateTime | ISO format |
| status | Text | confirmation_sent, etc. |
| response | Text | Client response |
| unique_id | Text | phone_date_time |

#### Sheet 2: "Duplicate_Check"
| Column | Data Type | Description |
|--------|-----------|-------------|
| phone | Text | Phone number |
| booking_date | Date | YYYY-MM-DD |
| timestamp | DateTime | When added |

#### Sheet 3: "Interactiv_AI"
| Column | Data Type | Description |
|--------|-----------|-------------|
| client_name | Text | Client name |
| phone | Text | Phone number |
| message | Text | Original message |
| ai_location | Text | Extracted location |
| ai_service | Text | Extracted service |
| ai_response | Text | Generated response |
| timestamp | DateTime | When processed |

#### Sheet 4: "No_Show"
| Column | Data Type | Description |
|--------|-----------|-------------|
| client_name | Text | Client full name |
| phone | Text | Phone number |
| booking_date | Date | Original booking date |
| booking_time | Time | Original booking time |
| location | Text | Salon location |
| whatsapp_sent | Boolean | WhatsApp message sent |
| sms_sent | Boolean | SMS fallback sent |
| timestamp | DateTime | When processed |
| follow_up_needed | Boolean | Requires human follow-up |

#### Sheet 5: "Recenzii_Trimise"
| Column | Data Type | Description |
|--------|-----------|-------------|
| client_name | Text | Client name |
| phone | Text | Phone number |
| email | Text | Email address |
| whatsapp_sent | Boolean | WhatsApp review request sent |
| email_sent | Boolean | Email review request sent |
| timestamp | DateTime | When sent |
| booking_date | Date | Original booking date |

#### Sheet 6: "Feedback_Repair"
| Column | Data Type | Description |
|--------|-----------|-------------|
| client_name | Text | Client name |
| rating | Number | 1-5 rating |
| feedback | Text | Original feedback text |
| ai_message | Text | Generated reconnection message |
| manager_notified | Boolean | Manager email sent |
| timestamp | DateTime | When processed |
| status | Text | pending_action, resolved, etc. |

---

## 🌐 WEBHOOK CONFIGURATION

### 1. **Booking Upload Webhook**
```
URL: https://your-n8n-instance.com/webhook/magic-hub-booking-upload
Method: POST
Headers: 
  - Content-Type: application/json
  - Authorization: Bearer YOUR_WEBHOOK_TOKEN
```

**Expected Payload:**
```json
{
  "firstname": "Ion",
  "lastname": "Popescu",
  "phone": "+40123456789",
  "email": "ion@example.com",
  "date": "2024-01-15",
  "time": "14:30",
  "location": "Crângași",
  "status": "new"
}
```

### 2. **WhatsApp Message Received Webhook**
```
URL: https://your-n8n-instance.com/webhook/whatsapp-message-received
Method: POST
Headers:
  - Content-Type: application/json
```

**360Dialog Webhook Format:**
```json
{
  "messages": [{
    "from": "40123456789",
    "id": "message_id",
    "timestamp": "1234567890",
    "text": {
      "body": "Message content"
    },
    "type": "text"
  }]
}
```

### 3. **No-Show Webhook**
```
URL: https://your-n8n-instance.com/webhook/no-show-webhook
Method: POST
```

### 4. **Feedback Upload Webhook**
```
URL: https://your-n8n-instance.com/webhook/feedback-upload
Method: POST
```

### 5. **Google Review Webhook**
```
URL: https://your-n8n-instance.com/webhook/google-review-webhook
Method: POST
```

---

## ⚙️ ENVIRONMENT VARIABLES

Create a `.env` file in your n8n installation:

```env
# WhatsApp Configuration
WHATSAPP_API_KEY=your_360dialog_api_key
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret

# Email Configuration
SENDER_EMAIL=noreply@magichub.ro
MANAGER_EMAIL=manager@magichub.ro

# Google Services
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_MAPS_REVIEW_LINK=https://g.page/r/YOUR_BUSINESS_ID/review

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Twilio (SMS Fallback)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Manager Contact
MANAGER_WHATSAPP=+40987654321

# Security
WEBHOOK_SECRET=your_secure_webhook_secret
```

---

## 🔐 SECURITY CONFIGURATION

### 1. **Webhook Security**
- Enable webhook authentication
- Use HTTPS only
- Implement rate limiting
- Add IP whitelisting if possible

### 2. **API Key Management**
- Store all keys in n8n credentials store
- Rotate keys regularly
- Monitor API usage
- Set up alerts for unusual activity

### 3. **Data Protection**
- Enable encryption at rest
- Implement data retention policies
- Add audit logging
- Regular backup of Google Sheets

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Import Workflow
1. Copy the JSON from `magic_hub_automation_final_v2.json`
2. In n8n, go to Workflows → Import from URL/File
3. Paste the JSON content
4. Click Import

### Step 2: Configure Credentials
1. Go to Settings → Credentials
2. Create each required credential type
3. Test connections for each service
4. Update workflow nodes with credential references

### Step 3: Set Environment Variables
1. Add all environment variables to your n8n instance
2. Restart n8n service
3. Verify variables are accessible in workflow

### Step 4: Setup Google Sheets
1. Create new Google Spreadsheet
2. Add all required sheets with proper column headers
3. Share with service account email (edit permissions)
4. Copy spreadsheet ID to environment variables

### Step 5: Configure Webhooks
1. Get webhook URLs from n8n
2. Configure 360Dialog webhook endpoint
3. Set up Fresha integration (if available)
4. Test webhook endpoints

### Step 6: Test Workflow
1. Use test data to verify each flow
2. Check error handling
3. Verify logging works correctly
4. Test API rate limits

### Step 7: Monitor & Maintain
1. Set up monitoring dashboards
2. Configure alerts for failures
3. Regular data cleanup
4. Performance optimization

---

## 🔍 TESTING & VALIDATION

### Test Cases:

#### 1. **Booking Confirmation Flow**
```bash
curl -X POST "https://your-n8n.com/webhook/magic-hub-booking-upload" \
-H "Content-Type: application/json" \
-d '{
  "firstname": "Test",
  "lastname": "User",
  "phone": "+40123456789",
  "email": "test@example.com",
  "date": "2024-01-15",
  "time": "14:30",
  "location": "Crângași",
  "status": "new"
}'
```

#### 2. **WhatsApp Message Processing**
```bash
curl -X POST "https://your-n8n.com/webhook/whatsapp-message-received" \
-H "Content-Type: application/json" \
-d '{
  "messages": [{
    "from": "40123456789",
    "text": {"body": "Vreau să rezerv un masaj la Crângași"},
    "type": "text",
    "id": "test123",
    "timestamp": "1234567890"
  }]
}'
```

#### 3. **No-Show Processing**
```bash
curl -X POST "https://your-n8n.com/webhook/no-show-webhook" \
-H "Content-Type: application/json" \
-d '{
  "firstname": "Test",
  "lastname": "User",
  "phone": "+40123456789",
  "date": "2024-01-15",
  "time": "14:30",
  "location": "Crângași",
  "status": "no show"
}'
```

---

## 📈 MONITORING & MAINTENANCE

### Key Metrics to Monitor:
- Workflow execution success rate
- API response times
- Message delivery rates
- Error frequencies
- Client engagement rates

### Regular Maintenance:
- Weekly Google Sheets cleanup
- Monthly API key rotation
- Quarterly performance review
- Annual security audit

### Alerts Setup:
- Failed API calls
- High error rates
- Webhook failures
- Unusual data patterns

---

## 🆘 TROUBLESHOOTING

### Common Issues:

#### 1. **WhatsApp Messages Not Sending**
- Check API key validity
- Verify phone number format
- Check 360Dialog account balance
- Review rate limits

#### 2. **Email Delivery Failures**
- Verify Gmail OAuth tokens
- Check email address format
- Review spam filters
- Monitor send quotas

#### 3. **Google Sheets Errors**
- Verify service account permissions
- Check spreadsheet ID
- Review sheet names and structure
- Monitor API quotas

#### 4. **AI Processing Failures**
- Verify OpenAI API key
- Check request format
- Monitor token usage
- Review rate limits

---

## ✅ GO-LIVE CHECKLIST

- [ ] All credentials configured and tested
- [ ] Environment variables set correctly
- [ ] Google Sheets structure created
- [ ] Webhook endpoints configured
- [ ] Test cases passed successfully
- [ ] Monitoring systems active
- [ ] Backup procedures in place
- [ ] Team training completed
- [ ] Documentation finalized
- [ ] Emergency contacts prepared

**🎉 Your Magic Hub automation workflow is now ready for production!**