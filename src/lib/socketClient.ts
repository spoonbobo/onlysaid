// @ts-ignore
import { io, Socket } from 'socket.io-client';

class BackendSocketClient {
    private static instance: BackendSocketClient;
    // @ts-ignore
    private socket: Socket | null = null;

    private constructor() { }

    public static getInstance(): BackendSocketClient {
        if (!BackendSocketClient.instance) {
            BackendSocketClient.instance = new BackendSocketClient();
        }
        return BackendSocketClient.instance;
    }

    // @ts-ignore
    public connect(): Socket {
        if (this.socket?.connected) {
            return this.socket;
        }

        this.socket = io(process.env.SOCKET_SERVER_URL || 'http://onlysaid-scoket_server:3001/', {
            path: '/socket.io/',
            transports: ['websocket', 'polling'],
            auth: {
                service: {
                    type: 'backend-service',
                    token: process.env.BACKEND_SERVICE_TOKEN || 'your-secret-service-token'
                }
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('✅ Backend service socket connected:', this.socket?.id);
        });

        this.socket.on('service_connection_established', (data: any) => {
            console.log('🔧 Backend service authenticated:', data);
        });

        this.socket.on('disconnect', (reason: any) => {
            console.log('❌ Backend service socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('🔥 Backend socket connection error:', error);
        });

        return this.socket;
    }

    // Generic emit method for backward compatibility
    public emit(event: string, data: any): void {
        const socket = this.connect();
        if (socket.connected) {
            socket.emit(event, data);
            console.log(`📡 Emitted ${event}:`, data);
        } else {
            console.warn(`Socket not connected, cannot emit: ${event}`);
        }
    }

    // Specific broadcast methods
    public broadcastFileProgress(operationId: string, progress: number, stage: string, userId: string): void {
        this.emit('file:progress', {
            operationId,
            progress,
            stage,
            userId
        });
    }

    public broadcastFileCompleted(operationId: string, result: any, userId: string): void {
        this.emit('file:completed', {
            operationId,
            result,
            userId
        });
    }

    public broadcastFileError(operationId: string, error: string, userId: string): void {
        this.emit('file:error', {
            operationId,
            error,
            userId
        });
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const backendSocketClient = BackendSocketClient.getInstance();