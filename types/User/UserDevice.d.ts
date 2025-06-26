export interface IUserDevice {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  last_seen: string;
  created_at: string;
}

export interface IUserDeviceRegisterArgs {
  token: string;
  data: {
    device_id: string;
    device_name?: string;
  };
}

export interface IUserDeviceUpdateArgs {
  token: string;
  data: {
    device_id: string;
    device_name?: string;
    last_seen?: string;
  };
}

export interface IUserDeviceRemoveArgs {
  token: string;
  device_id: string;
}

export interface IUserDeviceListArgs {
  token: string;
}

export interface IUserDeviceResponse {
  data: IUserDevice;
  message?: string;
}

export interface IUserDeviceListResponse {
  data: IUserDevice[];
} 