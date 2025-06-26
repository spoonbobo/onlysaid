export interface ISigninForm {
    usernameOrEmail: string;
    password: string;
}

export interface ISigninErrors {
    usernameOrEmail: string;
    password: string;
    general: string;
}