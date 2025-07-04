# Magic Hub Frontend ↔ N8N Workflows Integration Plan

## 🎯 Prezentare Generală

Această documentație descrie integrarea completă între sistemul frontend Magic Hub (React) și workflow-urile N8N pentru automatizarea proceselor salonului.

## 📊 Analiza Sistemului Frontend

### **Technology Stack Identificat:**
- **React 18.3.1** + Material-UI pentru interfață
- **Socket.io** pentru actualizări în timp real  
- **JWT Authentication** pentru securitate
- **Axios** pentru comunicarea cu API-ul
- **React Big Calendar** pentru management programări

### **Servicii Cheie Analizate:**

#### 1. **AppointmentService.js** (17KB)
```javascript
// Funcții cheie pentru integrare:
- getAppointments(params)           // Citire programări
- updateAppointmentStatus(id, status) // Actualizare status
- createNewAppointment(form)        // Programare nouă
- formatAppointmentData(appointment) // Formatare date
```

#### 2. **CustomerService.js** (4.4KB)  
```javascript
// Date clienți pentru personalizare:
- getCustomerById(customerId)       // Date client
- createCustomerForAppointment()    // Client nou  
- updateCustomer(id, details)       // Actualizare client
```

## 🔄 Maparea Workflow-urilor N8N

### **1. Booking Confirmation Workflow**

**Trigger Frontend → N8N:**
```javascript
// În AppointmentService.js - după createNewAppointment()
const triggerN8NConfirmation = async (appointmentData) => {
    await axios.post('https://n8n.magichub.ro/webhook/magic-hub-booking-upload', {
        firstname: appointmentData.customer.firstname,
        lastname: appointmentData.customer.lastname,
        phone: appointmentData.customer.phone, 
        email: appointmentData.customer.email,
        date: appointmentData.start_date,
        time: appointmentData.start_time,
        location: appointmentData.location.name,
        status: 'new'
    });
};
```

### **2. No-Show Management Workflow**

**Trigger Frontend → N8N:**
```javascript
// În AppointmentService.js - după updateAppointmentStatus()
const triggerN8NNoShow = async (appointmentData) => {
    if (appointmentData.status === 'no_show' || appointmentData.status === 'absent') {
        await axios.post('https://n8n.magichub.ro/webhook/no-show-webhook', {
            firstname: appointmentData.customer.firstname,
            lastname: appointmentData.customer.lastname,
            phone: appointmentData.customer.phone,
            date: appointmentData.start_date,
            time: appointmentData.start_time,
            location: appointmentData.location.name,
            status: appointmentData.status
        });
    }
};
```

## 🛠 Modificări Necesare în Frontend

### **1. Webhook Integration Service**

```javascript
// services/N8NIntegrationService.js
class N8NIntegrationService {
    static baseURL = 'https://n8n.magichub.ro/webhook';
    
    static async triggerBookingConfirmation(appointmentData) {
        return this.callWebhook('/magic-hub-booking-upload', appointmentData);
    }
    
    static async triggerNoShow(appointmentData) {
        return this.callWebhook('/no-show-webhook', appointmentData);
    }
    
    static async callWebhook(endpoint, data) {
        try {
            const response = await axios.post(`${this.baseURL}${endpoint}`, data);
            console.log(`N8N webhook ${endpoint} triggered successfully:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`N8N webhook ${endpoint} failed:`, error);
            throw error;
        }
    }
}
```

### **2. Status Change Hooks**

```javascript
// hooks/useAppointmentStatusHooks.js
export const useAppointmentStatusHooks = () => {
    const triggerN8NWorkflows = useCallback(async (appointment, oldStatus, newStatus) => {
        switch (newStatus) {
            case 'no_show':
            case 'absent':
                await N8NIntegrationService.triggerNoShow(appointment);
                break;
                
            case 'completed':
            case 'prezent':
                // Trigger follow-up workflow după 2 ore
                setTimeout(() => {
                    N8NIntegrationService.triggerFollowUp(appointment);
                }, 2 * 60 * 60 * 1000);
                break;
                
            default:
                console.log(`No N8N workflow for status: ${newStatus}`);
        }
    }, []);
    
    return { triggerN8NWorkflows };
};
```

## 🗃 Structura Datelor pentru Integrare

### **Appointment Data Model:**
```javascript
const appointmentForN8N = {
    // Date client
    firstname: appointment.customer.firstname,
    lastname: appointment.customer.lastname,
    phone: appointment.customer.phone,
    email: appointment.customer.email,
    
    // Date programare
    id: appointment.id,
    date: appointment.start_date,
    time: appointment.start_time,
    end_time: appointment.end_time,
    
    // Date locație și servicii
    location: appointment.location.name,
    location_id: appointment.location.id,
    services: appointment.variants.map(v => v.name),
    employee: appointment.employee.name,
    
    // Status și metadata
    status: appointment.status,
    total_price: appointment.total_price,
    created_at: appointment.created_at,
    updated_at: appointment.updated_at
};
```

## ✅ Checklist Implementare

### **Faza 1: Basic Integration**
- [ ] Creare N8NIntegrationService
- [ ] Implementare webhook calls pentru booking confirmation
- [ ] Testare flow confirmare programări

### **Faza 2: Status Management**  
- [ ] Integrare hooks pentru status changes
- [ ] Implementare no-show detection
- [ ] Follow-up automation pentru completed appointments

### **Faza 3: Advanced Features**
- [ ] AI message integration
- [ ] Feedback collection system
- [ ] Google Reviews automation
- [ ] Real-time notifications

### **Faza 4: Analytics & Monitoring**
- [ ] Dashboard stats integration
- [ ] Performance monitoring  
- [ ] Error handling și logging

## 🚀 Beneficii Complete

1. **Automatizare Completă** - Zero intervenție manuală pentru confirmări
2. **Experiență Client Îmbunătățită** - Comunicare proactivă și personalizată
3. **Recovery Rate Crescut** - Management automat no-show și feedback negativ  
4. **Eficiență Operațională** - Staff-ul se concentrează pe servicii, nu administrație
5. **Insights Valoroase** - Analytics în timp real pentru optimizare procese

---

*Această integrare transformă Magic Hub într-un sistem complet automatizat pentru managementul salonului cu AI.* 