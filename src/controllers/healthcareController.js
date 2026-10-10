// Dynamic Healthcare REST API Controller for CarePulse Health
// Serves doctors, appointments, blood diagnostic reports, overtime, SOS alerts, and registrations

// In-Memory dynamic storage with default mock seed
let doctors = [
  {
    id: "doc-1",
    name: "Dr. Manoj S. Kamble",
    qualification: "MBBS, MD (Medicine & Critical Care)",
    role: "Chief Physician & Medical Director",
    experience: "16+ Years Experience",
    rating: 4.95,
    reviews: 1420,
    location: "Mumbai - 400043 (Clinic & Home Visits)",
    phone: "+91 77749 32527",
    fees: { video: 500, clinic: 800, home: 1500 },
    availability: "Available Today",
    badges: ["Top Rated", "Hospital Director", "Emergency Lead"]
  },
  {
    id: "doc-2",
    name: "Dr. Sneha Deshmukh",
    qualification: "MBBS, DNB (Cardiology)",
    role: "Senior Consultant Cardiologist",
    experience: "12+ Years Experience",
    rating: 4.88,
    reviews: 890,
    location: "Mumbai Central & Dadar",
    phone: "+91 77749 32527",
    fees: { video: 600, clinic: 1000, home: 1800 },
    availability: "Slots Open Tomorrow",
    badges: ["Heart Specialist", "Gold Medalist"]
  },
  {
    id: "doc-3",
    name: "Dr. Amit Verma",
    qualification: "BPT, MPT (Neuro-Physiotherapy)",
    role: "Lead Physiotherapy Specialist",
    experience: "9+ Years Experience",
    rating: 4.92,
    reviews: 640,
    location: "Chembur, Ghatkopar & Navi Mumbai",
    phone: "+91 77749 32527",
    fees: { video: 400, clinic: 700, home: 1200 },
    availability: "Available Today",
    badges: ["Stroke Rehab", "Mobility Expert"]
  }
];

let appointments = [
  {
    id: "APT-8012",
    doctorName: "Dr. Manoj S. Kamble",
    doctorRole: "Chief Medical Director",
    patientName: "Smt. Shanti Devi",
    type: "Clinic Consultation",
    date: "08-Oct-2026",
    time: "10:30 AM",
    status: "Confirmed",
    tokenNo: "TK-04",
    location: "CarePulse Health Clinic, Mumbai - 400043",
    fee: "₹800",
    symptoms: "Post-discharge evaluation, lab report review & medication adjustment"
  },
  {
    id: "APT-8018",
    doctorName: "Dr. Amit Verma",
    doctorRole: "Lead Physiotherapist",
    patientName: "Smt. Shanti Devi",
    type: "Home Visit Consultation",
    date: "10-Oct-2026",
    time: "04:30 PM",
    status: "Scheduled",
    tokenNo: "TK-11",
    location: "Patient Residence, Chembur, Mumbai",
    fee: "₹1,200",
    symptoms: "Upper limb mobility & gait balance therapy session"
  }
];

let bloodReports = [
  {
    id: "BLD-901",
    testDate: "06-Oct-2026",
    patientName: "Smt. Shanti Devi",
    status: "Doctor Approved",
    doctorName: "Dr. Manoj S. Kamble (MBBS, MD)",
    rbs: 118,
    fbs: 94,
    hemoglobin: 13.5,
    creatinine: 0.88,
    clinicalAlerts: [],
    lft: {
      totalBilirubin: "0.75 mg/dL",
      sgot_ast: "24 U/L",
      sgpt_alt: "28 U/L",
      alkalinePhosphatase: "72 U/L",
      conclusion: "Normal Liver Metabolic Profile"
    },
    kft: {
      bloodUrea: "22 mg/dL",
      serumCreatinine: "0.88 mg/dL",
      uricAcid: "4.6 mg/dL",
      conclusion: "Adequate Renal Clearance"
    },
    lipid: {
      totalCholesterol: "165 mg/dL",
      triglycerides: "128 mg/dL",
      hdl: "48 mg/dL",
      ldl: "98 mg/dL",
      conclusion: "Healthy Cardiovascular Index"
    },
    doctorRemarks: "All clinical lab markers are well within standard parameters. Cleared for normal recovery."
  }
];

let overtimeRecord = {
  staffName: "Sister Sunita Patil",
  baseHourlyRate: 100,
  overtimeHourlyRate: 200, // Double Pay as per PDF Rule 8
  currentStandardHours: 8,
  overtimeHoursWorked: 3,
  clientApprovalStatus: "Approved by Client",
  separateBillingAmount: 600,
  reason: "Attended patient for emergency post-op monitoring until 11:30 PM"
};

let registrations = [];
let sosAlerts = [];

export const healthcareController = {
  // 1. DOCTORS API
  getDoctors(req, res) {
    return res.status(200).json({
      success: true,
      count: doctors.length,
      doctors
    });
  },

  getDoctorById(req, res) {
    const doc = doctors.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: "Doctor not found" });
    return res.status(200).json({ success: true, doctor: doc });
  },

  // 2. APPOINTMENTS API
  getAppointments(req, res) {
    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments
    });
  },

  bookAppointment(req, res) {
    const { doctorName, patientName, type, date, time, location, fee, symptoms } = req.body;

    if (!patientName) {
      return res.status(400).json({ error: "Patient name is required" });
    }

    const newApt = {
      id: "APT-" + Math.floor(1000 + Math.random() * 9000),
      doctorName: doctorName || "Dr. Manoj S. Kamble",
      doctorRole: "Physician",
      patientName,
      type: type || "Clinic Consultation",
      date: date || "Today",
      time: time || "11:00 AM",
      status: "Confirmed",
      tokenNo: "TK-" + Math.floor(10 + Math.random() * 40),
      location: location || "CarePulse Health Clinic, Mumbai - 400043",
      fee: fee || "₹800",
      symptoms: symptoms || "General Consultation",
      createdAt: new Date().toISOString()
    };

    appointments.unshift(newApt);

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment: newApt
    });
  },

  updateAppointmentStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const apt = appointments.find(a => a.id === id);
    if (!apt) return res.status(404).json({ error: "Appointment not found" });

    apt.status = status || apt.status;
    return res.status(200).json({ success: true, appointment: apt });
  },

  deleteAppointment(req, res) {
    const { id } = req.params;
    appointments = appointments.filter(a => a.id !== id);
    return res.status(200).json({ success: true, message: "Appointment deleted" });
  },

  // 3. BLOOD TESTS API
  getBloodTests(req, res) {
    return res.status(200).json({
      success: true,
      count: bloodReports.length,
      reports: bloodReports
    });
  },

  addBloodTest(req, res) {
    const { patientName, rbs, fbs, hemoglobin, creatinine } = req.body;

    const numRbs = Number(rbs || 120);
    const numFbs = Number(fbs || 95);
    const numHb = Number(hemoglobin || 13.5);
    const numCr = Number(creatinine || 0.9);

    const alerts = [];
    if (numRbs > 140) alerts.push("Elevated Blood Sugar (RBS > 140)");
    if (numFbs > 100) alerts.push("Impaired Fasting Glucose (FBS > 100)");
    if (numHb < 12.0) alerts.push("Low Hemoglobin (Mild Anemia Risk)");
    if (numCr > 1.20) alerts.push("Elevated Serum Creatinine");

    const newReport = {
      id: "BLD-" + Math.floor(100 + Math.random() * 900),
      testDate: new Date().toLocaleDateString('en-GB'),
      patientName: patientName || "Patient",
      status: "Doctor Verified",
      doctorName: "Dr. Manoj S. Kamble (MBBS, MD)",
      rbs: numRbs,
      fbs: numFbs,
      hemoglobin: numHb,
      creatinine: numCr,
      clinicalAlerts: alerts,
      lft: {
        totalBilirubin: "0.75 mg/dL",
        sgot_ast: "24 U/L",
        sgpt_alt: "28 U/L",
        alkalinePhosphatase: "72 U/L",
        conclusion: "Normal Liver Metabolic Profile"
      },
      kft: {
        bloodUrea: "22 mg/dL",
        serumCreatinine: `${numCr} mg/dL`,
        uricAcid: "4.6 mg/dL",
        conclusion: numCr > 1.2 ? "Renal Attention Advised" : "Adequate Renal Clearance"
      },
      lipid: {
        totalCholesterol: "165 mg/dL",
        triglycerides: "128 mg/dL",
        hdl: "48 mg/dL",
        ldl: "98 mg/dL",
        conclusion: "Healthy Cardiovascular Index"
      },
      doctorRemarks: alerts.length > 0 
        ? `Clinical Attention: ${alerts.join(', ')}. Review prescribed regimen.`
        : "All markers are well within standard physiological limits."
    };

    bloodReports.unshift(newReport);

    return res.status(201).json({
      success: true,
      message: "Blood test analyzed and recorded",
      report: newReport
    });
  },

  // 4. OVERTIME & BILLING API (PDF Rule 8)
  getOvertime(req, res) {
    return res.status(200).json({
      success: true,
      overtime: overtimeRecord
    });
  },

  requestOvertime(req, res) {
    const { hours } = req.body;
    const addHours = Number(hours || 2);
    const addedBill = addHours * 200; // Double Pay ₹200/hr

    overtimeRecord = {
      ...overtimeRecord,
      overtimeHoursWorked: overtimeRecord.overtimeHoursWorked + addHours,
      separateBillingAmount: overtimeRecord.separateBillingAmount + addedBill,
      clientApprovalStatus: "Awaiting Client Approval"
    };

    return res.status(200).json({
      success: true,
      message: `Overtime request for ${addHours}h (₹${addedBill}) sent to client`,
      overtime: overtimeRecord
    });
  },

  approveOvertime(req, res) {
    overtimeRecord = {
      ...overtimeRecord,
      clientApprovalStatus: "Approved by Client"
    };

    return res.status(200).json({
      success: true,
      message: "Overtime billing approved by client",
      overtime: overtimeRecord
    });
  },

  releasePayout(req, res) {
    return res.status(200).json({
      success: true,
      message: "AI Biometric payout released successfully via UPI/Direct Bank",
      amount: 6800,
      timestamp: new Date().toISOString()
    });
  },

  // 5. EMERGENCY SOS API
  triggerSos(req, res) {
    const { patientName, location, coordinates, reason } = req.body;

    const alert = {
      id: "SOS-" + Date.now(),
      patientName: patientName || "Emergency Patient",
      location: location || "Mumbai - 400043",
      coordinates: coordinates || { lat: 19.0760, lng: 72.8777 },
      timestamp: new Date().toISOString(),
      doctorContact: "+91 77749 32527",
      doctorName: "Dr. Manoj S. Kamble",
      status: "Dispatched",
      ambulanceEtaMinutes: 8
    };

    sosAlerts.unshift(alert);

    console.log(`🚨 [EMERGENCY SOS ALERT ACTIVATED] Patient: ${alert.patientName} | Location: ${alert.location}`);

    return res.status(200).json({
      success: true,
      message: "Emergency SOS broadcasted! Ambulance & Dr. Manoj S. Kamble alerted.",
      alert
    });
  },

  // 6. REGISTRATIONS API
  getRegistrations(req, res) {
    return res.status(200).json({
      success: true,
      count: registrations.length,
      registrations
    });
  },

  createRegistration(req, res) {
    const { type, name, mobile, role, address } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: "Name and mobile number are required" });
    }

    const newReg = {
      id: "REG-" + Math.floor(1000 + Math.random() * 9000),
      type: type || "client",
      name,
      mobile,
      role: role || (type === "employee" ? "Nurse" : "Patient"),
      address: address || "Mumbai",
      date: new Date().toLocaleDateString(),
      aiVerified: type === "employee",
      status: "Approved"
    };

    registrations.unshift(newReg);

    return res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      registration: newReg
    });
  }
};
