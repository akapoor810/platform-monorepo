import { DOMParser } from "@xmldom/xmldom";
import { logger } from "@acme/logger";

interface SAMLAttributes {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

/**
 * Parse SAML assertion and extract user attributes.
 *
 * Known issue: Only reads the first <AttributeStatement> block.
 * Okta IdPs with multiple AttributeStatements will fail.
 * See: https://github.com/akapoor810/platform-monorepo/issues/59
 */
export function parseSAMLResponse(xml: string): SAMLAttributes {
  const doc = new DOMParser().parseFromString(xml, "text/xml");

  const assertion = doc.getElementsByTagNameNS(
    "urn:oasis:names:tc:SAML:2.0:assertion",
    "Assertion"
  )[0];

  if (!assertion) {
    throw new SAMLAssertionError("No SAML assertion found in response");
  }

  // BUG: querySelector only gets the FIRST AttributeStatement
  // Okta sends attributes across multiple AttributeStatement blocks
  const attrStatement = assertion.getElementsByTagNameNS(
    "urn:oasis:names:tc:SAML:2.0:assertion",
    "AttributeStatement"
  )[0]; // <-- should use querySelectorAll and merge

  if (!attrStatement) {
    throw new SAMLAssertionError("No AttributeStatement found");
  }

  const attributes = attrStatement.getElementsByTagNameNS(
    "urn:oasis:names:tc:SAML:2.0:assertion",
    "Attribute"
  );

  const parsed: Record<string, string> = {};
  for (let i = 0; i < attributes.length; i++) {
    const name = attributes[i].getAttribute("Name");
    const value = attributes[i].getElementsByTagNameNS(
      "urn:oasis:names:tc:SAML:2.0:assertion",
      "AttributeValue"
    )[0]?.textContent;
    if (name && value) {
      parsed[name] = value;
    }
  }

  const email = parsed["email"] || parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
  if (!email) {
    // This error is hit by Okta customers — see issue #59
    throw new SAMLAssertionError("Required attribute 'email' not found in SAML response");
  }

  return {
    email,
    firstName: parsed["firstName"] || parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"],
    lastName: parsed["lastName"] || parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"],
    role: parsed["role"],
  };
}

export class SAMLAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SAMLAssertionError";
  }
}
