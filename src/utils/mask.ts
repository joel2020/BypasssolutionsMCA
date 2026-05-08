function last4(value: string) {
  return value.replace(/\D/g, '').slice(-4).padStart(4, '*');
}

export function maskSSN(ssn: string) {
  return `***-**-${last4(ssn)}`;
}

export function maskEIN(ein: string) {
  return `**-***${last4(ein)}`;
}

export function maskAccount(num: string) {
  return `••••••${last4(num)}`;
}
