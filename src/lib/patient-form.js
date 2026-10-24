/**
 * Client-side mirror of the backend patient validation rules
 * (`backend/src/validators/api.validator.js`). The API remains the source of
 * truth - these checks only give immediate feedback before a request is sent.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]+$/;
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const PATIENT_STATUS_OPTIONS = Object.freeze([
  { value: "active", label: "Active" },
  { value: "critical", label: "Critical" },
  { value: "recovered", label: "Recovered" },
  { value: "inactive", label: "Inactive" },
]);

export const GENDER_OPTIONS = Object.freeze([
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
]);

export const BLOOD_GROUP_OPTIONS = Object.freeze([
  { value: "A+", label: "A+" },
  { value: "A-", label: "A−" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B−" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB−" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O−" },
]);

export const EMPTY_PATIENT_FORM = Object.freeze({
  name: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  bloodGroup: "",
  condition: "",
  status: "active",
  doctor: "",
  admissionDate: "",
  lastVisitDate: "",
  notes: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
});

/** Converts an ISO timestamp to the `YYYY-MM-DD` value an `<input type=date>` needs. */
export function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function patientToForm(patient) {
  if (!patient) return { ...EMPTY_PATIENT_FORM };

  return {
    name: patient.name ?? "",
    email: patient.email ?? "",
    phone: patient.phone ?? "",
    gender: patient.gender ?? "",
    dateOfBirth: toDateInput(patient.dateOfBirth),
    bloodGroup: patient.bloodGroup ?? "",
    condition: patient.condition ?? "",
    status: patient.status ?? "active",
    doctor: patient.doctor?._id ?? patient.doctor ?? "",
    admissionDate: toDateInput(patient.admissionDate),
    lastVisitDate: toDateInput(patient.lastVisitDate),
    notes: patient.notes ?? "",
    addressStreet: patient.address?.street ?? "",
    addressCity: patient.address?.city ?? "",
    addressState: patient.address?.state ?? "",
    addressZip: patient.address?.zip ?? "",
  };
}

const isValidDateInput = (value) => {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
};

export function validatePatientForm(values) {
  const errors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Patient name is required.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  else if (name.length > 120) errors.name = "Name cannot exceed 120 characters.";

  const email = values.email.trim();
  if (email.length > 160) {
    errors.email = "Email cannot exceed 160 characters.";
  } else if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
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

  if (!values.gender) {
    errors.gender = "Select a gender.";
  }

  if (!isValidDateInput(values.dateOfBirth)) {
    errors.dateOfBirth = "Enter a valid date of birth.";
  }

  const condition = values.condition.trim();
  if (!condition) errors.condition = "Primary condition is required.";
  else if (condition.length < 2) {
    errors.condition = "Condition must be at least 2 characters.";
  } else if (condition.length > 120) {
    errors.condition = "Condition cannot exceed 120 characters.";
  }

  if (!values.doctor) {
    errors.doctor = "Select a primary doctor.";
  } else if (!OBJECT_ID_PATTERN.test(values.doctor)) {
    errors.doctor = "Select a valid primary doctor.";
  }

  if (!isValidDateInput(values.admissionDate)) {
    errors.admissionDate = "Enter a valid admission date.";
  }

  if (!isValidDateInput(values.lastVisitDate)) {
    errors.lastVisitDate = "Enter a valid last visit date.";
  }

  if (values.notes.trim().length > 500) {
    errors.notes = "Notes cannot exceed 500 characters.";
  }

  if (values.addressStreet.trim().length > 160) {
    errors.addressStreet = "Street cannot exceed 160 characters.";
  }
  if (values.addressCity.trim().length > 80) {
    errors.addressCity = "City cannot exceed 80 characters.";
  }
  if (values.addressState.trim().length > 80) {
    errors.addressState = "State cannot exceed 80 characters.";
  }
  if (values.addressZip.trim().length > 20) {
    errors.addressZip = "ZIP cannot exceed 20 characters.";
  }

  return errors;
}

/** Maps API field paths such as `address.street` to this form's flat keys. */
export function mapPatientFieldErrors(fieldErrors) {
  const mapped = {};

  for (const [field, message] of Object.entries(fieldErrors || {})) {
    if (field === "address.street") mapped.addressStreet = message;
    else if (field === "address.city") mapped.addressCity = message;
    else if (field === "address.state") mapped.addressState = message;
    else if (field === "address.zip") mapped.addressZip = message;
    else mapped[field] = message;
  }

  return mapped;
}

/**
 * Builds a payload that only contains fields the API accepts (`.strict()`).
 * Blank optional dates are omitted because the API cannot clear a stored date.
 */
export function toPatientPayload(values) {
  const payload = {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    gender: values.gender,
    bloodGroup: values.bloodGroup,
    condition: values.condition.trim(),
    status: values.status,
    doctor: values.doctor,
    notes: values.notes.trim(),
    address: {
      street: values.addressStreet.trim(),
      city: values.addressCity.trim(),
      state: values.addressState.trim(),
      zip: values.addressZip.trim(),
    },
  };

  if (values.dateOfBirth) payload.dateOfBirth = values.dateOfBirth;
  if (values.admissionDate) payload.admissionDate = values.admissionDate;
  if (values.lastVisitDate) payload.lastVisitDate = values.lastVisitDate;

  return payload;
}
