export interface SignupForm {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
}

export interface SignupErrors {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: string;
}

export interface ProfileFormData {
    email: string;
    avatarUrl: string;
}

export interface ProfileFormErrors {
    email?: string; 
}
