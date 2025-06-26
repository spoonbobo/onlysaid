// Simple SSE manager for handling server-sent events

type SSEEvent = {
    type: string;
    data: any;
    planId?: string;
};

class SSEManager {
    private clients: Map<string, Set<Response>> = new Map();

    // Add a client connection
    addClient(planId: string, response: Response): void {
        if (!this.clients.has(planId)) {
            this.clients.set(planId, new Set());
        }
        this.clients.get(planId)?.add(response);
    }

    // Remove a client connection
    removeClient(planId: string, response: Response): void {
        const planClients = this.clients.get(planId);
        if (planClients) {
            planClients.delete(response);
            if (planClients.size === 0) {
                this.clients.delete(planId);
            }
        }
    }

    // Send an event to all clients subscribed to a specific plan
    sendEvent(event: SSEEvent): void {
        const planId = event.planId;

        if (planId && this.clients.has(planId)) {
            const planClients = this.clients.get(planId)!;

            for (const client of planClients) {
                const controller = (client as any).controller;
                if (controller && !controller.closed) {
                    const eventString = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(eventString));
                }
            }
        }
    }
}

// Singleton instance
let sseManagerInstance: SSEManager | null = null;

export function getSSEManager(): SSEManager {
    if (!sseManagerInstance) {
        sseManagerInstance = new SSEManager();
    }
    return sseManagerInstance;
} 