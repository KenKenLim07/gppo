// Security Configuration for Police Tracking Application
// This file contains security measures to protect sensitive operations

export interface SecurityConfig {
  // Rate limiting settings
  rateLimit: {
    loginAttempts: number;
    signupAttempts: number;
    locationUpdates: number;
    cooldownMinutes: number;
  };
  
  // Domain restrictions
  allowedDomains: string[];
  
  // Security headers
  securityHeaders: Record<string, string>;
  
  // Feature flags
  features: {
    publicSignup: boolean;
    locationSharing: boolean;
    backgroundTracking: boolean;
  };
}

// Production security configuration
export const securityConfig: SecurityConfig = {
  rateLimit: {
    loginAttempts: 5,
    signupAttempts: 3,
    locationUpdates: 100, // per hour
    cooldownMinutes: 15
  },
  
  // Allow common email domains for police officers
  // Many officers use personal emails for work
  allowedDomains: [
    // Government domains
    'pnp.gov.ph',
    'guimaras.gov.ph',
    'gov.ph',
    'philippines.gov.ph',
    
    // Common personal email providers
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    
    // Philippine email providers
    'yahoo.com.ph',
    'gmail.com.ph',
    
    // Add other authorized domains as needed
  ],
  
  securityHeaders: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://firebase.googleapis.com https://identitytoolkit.googleapis.com wss://s-usc1c-nss-2077.firebaseio.com;"
  },
  
  features: {
    publicSignup: false, // Disable public signup in production
    locationSharing: true,
    backgroundTracking: true
  }
};

// Development security configuration (more permissive)
export const devSecurityConfig: SecurityConfig = {
  rateLimit: {
    loginAttempts: 10,
    signupAttempts: 5,
    locationUpdates: 1000,
    cooldownMinutes: 5
  },
  
  allowedDomains: [
    // Development domains
    'localhost',
    '127.0.0.1',
    
    // Government domains
    'pnp.gov.ph',
    'guimaras.gov.ph',
    'gov.ph',
    'philippines.gov.ph',
    
    // Common personal email providers
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    
    // Philippine email providers
    'yahoo.com.ph',
    'gmail.com.ph',
    
    // Allow any domain for development testing
    '*'
  ],
  
  securityHeaders: {
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block'
  },
  
  features: {
    publicSignup: true, // Allow signup during development
    locationSharing: true,
    backgroundTracking: true
  }
};

// Get current security config based on environment
export const getSecurityConfig = (): SecurityConfig => {
  return process.env.NODE_ENV === 'production' ? securityConfig : devSecurityConfig;
};

// Security utility functions
export const securityUtils = {
  // Validate email domain
  isValidDomain: (email: string): boolean => {
    const config = getSecurityConfig();
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Allow all domains in development
    if (config.allowedDomains.includes('*')) {
      return true;
    }
    
    return config.allowedDomains.some(allowed => 
      domain === allowed || domain?.endsWith(`.${allowed}`)
    );
  },
  
  // Sanitize user input
  sanitizeInput: (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  },
  
  // Generate secure random string
  generateSecureToken: (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Check if request is from authorized source
  isAuthorizedRequest: (origin: string): boolean => {
    const config = getSecurityConfig();
    return config.allowedDomains.some(domain => 
      origin.includes(domain) || origin === 'http://localhost:3000'
    );
  }
};

// Security middleware for API calls
export const securityMiddleware = {
  // Rate limiting check
  checkRateLimit: (_action: string, _userId?: string): boolean => {
    // Implementation would check against stored attempt counts
    // For now, return true (implement with Redis/database in production)
    return true;
  },
  
  // Validate request headers
  validateHeaders: (headers: Headers): boolean => {
    const config = getSecurityConfig();
    const origin = headers.get('origin');
    
    if (!origin) return false;
    
    return config.allowedDomains.some(domain => 
      origin.includes(domain) || origin === 'http://localhost:3000'
    );
  },
  
  // Log security events
  logSecurityEvent: (event: string, details: any): void => {
    console.warn(`Security Event: ${event}`, details);
    // In production, send to security monitoring service
  }
};

export default securityConfig; 