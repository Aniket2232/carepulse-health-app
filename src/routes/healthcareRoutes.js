import { Router } from 'express';
import { healthcareController } from '../controllers/healthcareController.js';

const router = Router();

// 1. Doctors
router.get('/doctors', healthcareController.getDoctors);
router.get('/doctors/:id', healthcareController.getDoctorById);

// 2. Appointments
router.get('/appointments', healthcareController.getAppointments);
router.post('/appointments', healthcareController.bookAppointment);
router.patch('/appointments/:id', healthcareController.updateAppointmentStatus);
router.delete('/appointments/:id', healthcareController.deleteAppointment);

// 3. Blood Diagnostic Tests
router.get('/blood-tests', healthcareController.getBloodTests);
router.post('/blood-tests', healthcareController.addBloodTest);

// 4. Overtime & Separate Billing (Double Pay Rule)
router.get('/overtime', healthcareController.getOvertime);
router.post('/overtime/request', healthcareController.requestOvertime);
router.post('/overtime/approve', healthcareController.approveOvertime);
router.post('/overtime/payout', healthcareController.releasePayout);

// 5. Emergency SOS Dispatch
router.post('/sos', healthcareController.triggerSos);

// 6. Registrations
router.get('/registrations', healthcareController.getRegistrations);
router.post('/registrations', healthcareController.createRegistration);

export default router;
