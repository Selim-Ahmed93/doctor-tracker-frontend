/**
 * Client-side mirror of the backend doctor validation rules
 * (`backend/src/validators/api.validator.js`). The API remains the source of
 * truth - these checks only give immediate feedback before a request is sent.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]+$/;

export const DOCTOR_STATUS_OPTIONS = Object.freeze([
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "inactive", label: "Inactive" },
]);

export const EMPTY_DOCTOR_FORM = Object.freeze({
  name: "",
  specialization: "",
  hospital: "",
  phone: "",
  email: "",
  city: "",
  qualification: "",
  experienceYears: "",
  consultationFee: "",
  status: "active",
});

export function doctorToForm(doctor) {
  if (!doctor) return { ...EMPTY_DOCTOR_FORM };

  return {
    name: doctor.name ?? "",
    specialization: doctor.specialization ?? "",
    hospital: doctor.hospital ?? "",
    phone: doctor.phone ?? "",
    email: doctor.email ?? "",
    city: doctor.city ?? "",
    qualification: doctor.qualification ?? "",
    experienceYears: doctor.experienceYears ?? "",
    consultationFee: doctor.consultationFee ?? "",
    status: doctor.status ?? "active",
  };
}

export function validateDoctorForm(values) {
  const errors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Doctor name is required.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  else if (name.length > 120) errors.name = "Name cannot exceed 120 characters.";

  if (!values.specialization) {
    errors.specialization = "Select a specialization.";
  }

  const hospital = values.hospital.trim();
  if (!hospital) errors.hospital = "Hospital is required.";
  else if (hospital.length < 2) {
    errors.hospital = "Hospital must be at least 2 characters.";
  } else if (hospital.length > 160) {
    errors.hospital = "Hospital cannot exceed 160 characters.";
  }

  const phone = values.phone.trim();
  if (!phone) errors.phone = "Phone number is required.";
  else if (phone.length < 7) {
    errors.phone = "Phone number must be at least 7 characters.";
  } else if (phone.length > 20) {
    errors.phone = "Phone number cannot exceed 20 characters.";
  } else if (!PHONE_PATTERN.test(phone)) {
    errors.phone = "Use digits, spaces, +, -, and parentheses only.";
  }

  const email = values.email.trim();
  if (!email) errors.email = "Email is required.";
  else if (email.length > 160) {
    errors.email = "Email cannot exceed 160 characters.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (values.city.trim().length > 80) {
    errors.city = "City cannot exceed 80 characters.";
  }

  if (values.qualification.trim().length > 120) {
    errors.qualification = "Qualification cannot exceed 120 characters.";
  }

  if (values.experienceYears !== "") {
    const years = Number(values.experienceYears);
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      errors.experienceYears = "Enter a whole number from 0 to 60.";
    }
  }

  if (values.consultationFee !== "") {
    const fee = Number(values.consultationFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 1000000) {
      errors.consultationFee = "Enter an amount from 0 to 1,000,000.";
    }
  }

  return errors;
}

/** Builds a payload that only contains fields the API accepts (`.strict()`). */
export function toDoctorPayload(values) {
  const payload = {
    name: values.name.trim(),
    specialization: values.specialization,
    hospital: values.hospital.trim(),
    phone: values.phone.trim(),
    email: values.email.trim().toLowerCase(),
    city: values.city.trim(),
    qualification: values.qualification.trim(),
    status: values.status,
  };

  if (values.experienceYears !== "") {
    payload.experienceYears = Number(values.experienceYears);
  }

  if (values.consultationFee !== "") {
    payload.consultationFee = Number(values.consultationFee);
  }

  return payload;
}
