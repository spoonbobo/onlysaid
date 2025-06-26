export interface AgentProvider {
  /**
   * Human readable name for the provider.
   * @example "OnlySaid"
   */
  name: string;
  /**
   * A URL to documentation for the provider.
   */
  documentationUrl?: string;
}

export interface AgentCapabilities {
  /**
   * Whether the agent supports streaming responses.
   */
  streaming?: boolean;
  /**
   * Whether the agent supports push notifications.
   */
  pushNotifications?: boolean;
  /**
   * Whether the agent supports tool calling.
   */
  toolCalling?: boolean;
  /**
   * Whether the agent supports knowledge base integration.
   */
  knowledgeBase?: boolean;
  /**
   * Whether the agent supports multi-modal input/output.
   */
  multiModal?: boolean;
}

export interface SecurityScheme {
  /**
   * The type of security scheme.
   */
  type: 'apiKey' | 'bearer' | 'oauth2' | 'basic';
  /**
   * Description of the security scheme.
   */
  description?: string;
  /**
   * The name of the header, query parameter or cookie parameter to be used.
   */
  name?: string;
  /**
   * The location of the API key.
   */
  in?: 'query' | 'header' | 'cookie';
}

export interface AgentSkill {
  /**
   * Human readable name of the skill.
   * @example "Web Search"
   */
  name: string;
  /**
   * A human-readable description of the skill.
   * @example "Search the web for information"
   */
  description: string;
  /**
   * The category this skill belongs to.
   * @example "research" | "analysis" | "creative" | "technical" | "communication" | "validation" | "rag"
   */
  category: string;
  /**
   * Input media types supported by this skill.
   */
  inputModes: string[];
  /**
   * Output media types produced by this skill.
   */
  outputModes: string[];
  /**
   * Whether this skill requires human approval.
   */
  requiresApproval?: boolean;
  /**
   * Tools associated with this skill.
   */
  tools?: string[];
}

export interface AgentCard {
  /**
   * Human readable name of the agent.
   * @example "Research Agent"
   */
  name: string;
  /**
   * A human-readable description of the agent. Used to assist users and
   * other agents in understanding what the agent can do.
   * @example "Agent that helps users with research and information gathering."
   */
  description: string;
  /** A URL to the address the agent is hosted at. */
  url: string;
  /** A URL to an icon for the agent. */
  iconUrl?: string;
  /** The service provider of the agent */
  provider?: AgentProvider;
  /**
   * The version of the agent - format is up to the provider.
   * @example "1.0.0"
   */
  version: string;
  /** A URL to documentation for the agent. */
  documentationUrl?: string;
  /** Optional capabilities supported by the agent. */
  capabilities: AgentCapabilities;
  /** Security scheme details used for authenticating with this agent. */
  securitySchemes?: { [scheme: string]: SecurityScheme };
  /** Security requirements for contacting the agent. */
  security?: { [scheme: string]: string[] }[];
  /**
   * The set of interaction modes that the agent supports across all skills. This can be overridden per-skill.
   * Supported media types for input.
   */
  defaultInputModes: string[];
  /** Supported media types for output. */
  defaultOutputModes: string[];
  /** Skills are a unit of capability that an agent can perform. */
  skills: AgentSkill[];
  /**
   * true if the agent supports providing an extended agent card when the user is authenticated.
   * Defaults to false if not specified.
   */
  supportsAuthenticatedExtendedCard?: boolean;
  /** Current status of the agent */
  status?: 'idle' | 'busy' | 'completed' | 'failed' | 'awaiting_approval';
  /** Current task being performed by the agent */
  currentTask?: string;
  /** Agent expertise areas */
  expertise?: string[];
  /** Agent runtime ID (for OSSwarm agents) */
  runtimeId?: string;
  /** Agent role in the swarm */
  role?: string;
  type?: 'agent' | 'swarm';
} 