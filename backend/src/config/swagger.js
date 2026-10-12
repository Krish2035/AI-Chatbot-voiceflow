import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Voiceflow AI Chatbot API',
    version: '2.0.0',
    description: `
**Top 1% Tier Scalable Backend Architecture** for Voiceflow AI Chatbot.
Features:
- **Load Balancer**: Nginx Reverse Proxy with upstream health balancing
- **Drizzle ORM & PostgreSQL**: Type-safe relational data modeling
- **Read Replicas**: Write-Read traffic splitting for horizontal scale
- **Search Indexing**: PostgreSQL Full-Text GIN Search with rank scoring
- **Redis Cache & BullMQ**: Distributed caching & background job orchestration
- **JWT & Firebase Google Auth**: Dual authentication mechanisms
- **Rate Limiting**: Sliding-window DDoS and abuse protection
    `,
    contact: {
      name: 'Voiceflow Engineering Team',
      url: 'https://github.com/Krish2035/AI-Chatbot-voiceflow'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Backend Server'
    },
    {
      url: 'http://localhost:80',
      description: 'Nginx Load Balancer'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token obtained from /api/auth/login or /api/auth/register.'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          email: { type: 'string', example: 'user@example.com' },
          displayName: { type: 'string', example: 'Alex Mercer' },
          avatarUrl: { type: 'string', example: 'https://lh3.googleusercontent.com/...' },
          authProvider: { type: 'string', example: 'local' }
        }
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'conv_a1b2c3d4e5f6' },
          userId: { type: 'integer', nullable: true, example: 1 },
          title: { type: 'string', example: 'Quantum Computing Overview' },
          message_count: { type: 'integer', example: 4 },
          last_message: { type: 'string', example: 'Quantum superposition allows qubits...' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 42 },
          conversationId: { type: 'string', example: 'conv_a1b2c3d4e5f6' },
          sender: { type: 'string', enum: ['user', 'assistant', 'system'], example: 'assistant' },
          content: { type: 'string', example: 'Hello! How can I assist you today?' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'System Health & Infrastructure Status',
        description: 'Returns real-time health for Primary DB, Read Replicas, Redis, BullMQ, Groq, and Hugging Face key pools.',
        responses: {
          '200': {
            description: 'Infrastructure is online and healthy'
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'coder@voiceflow.ai' },
                  password: { type: 'string', example: 'SuperSecure123!' },
                  displayName: { type: 'string', example: 'Krish Sharma' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'User successfully registered, returns JWT token and profile' },
          '400': { description: 'Validation error or email already in use' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate user with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'coder@voiceflow.ai' },
                  password: { type: 'string', example: 'SuperSecure123!' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Authentication successful, returns JWT token' },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/google': {
      post: {
        summary: 'Continue with Google (Firebase Auth)',
        description: 'Ingests Firebase Google OAuth credentials and returns unified JWT session.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'user@gmail.com' },
                  displayName: { type: 'string', example: 'Alex Smith' },
                  photoUrl: { type: 'string', example: 'https://lh3.googleusercontent.com/...' },
                  firebaseUid: { type: 'string', example: 'FIREBASE_UID_12345' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Google authentication successful' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Get authenticated user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Current user profile returned' },
          '401': { description: 'Missing or expired JWT' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'Log out user',
        responses: {
          '200': { description: 'Successfully logged out' }
        }
      }
    },
    '/api/chat': {
      post: {
        summary: 'Send a multi-turn chat message',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', example: 'Explain event loop in Node.js' },
                  conversationId: { type: 'string', example: 'conv_abc123' },
                  provider: { type: 'string', enum: ['groq', 'huggingface'], example: 'groq' },
                  model: { type: 'string', example: 'llama-3.3-70b-versatile' },
                  voiceMode: { type: 'boolean', example: false }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Chat generated with full conversational context' },
          '429': { description: 'Rate limit exceeded' }
        }
      }
    },
    '/api/voice/chat': {
      post: {
        summary: 'Voice roundtrip chat with Whisper transcription & LLM reply',
        description: 'Accepts audio file (multipart/form-data) or text, transcribes via Groq Whisper, queries LLM with memory, and returns conversational response.',
        responses: {
          '200': { description: 'Voice processed and answered' }
        }
      }
    },
    '/api/history/conversations': {
      get: {
        summary: 'List conversation sessions (Read Replica + Redis cache)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Array of conversation sessions' }
        }
      },
      post: {
        summary: 'Create a new conversation session',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Project Brainstorming' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'New conversation created' }
        }
      }
    },
    '/api/history/conversations/{id}': {
      get: {
        summary: 'Get all messages in a conversation',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'List of messages' }
        }
      },
      delete: {
        summary: 'Delete a conversation',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Conversation deleted' }
        }
      }
    },
    '/api/history/search': {
      get: {
        summary: 'Full-text indexed search across messages (PostgreSQL Full-Text GIN index)',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query',
            schema: { type: 'string', example: 'database' }
          },
          {
            name: 'conversationId',
            in: 'query',
            required: false,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Rank-scored search results' }
        }
      }
    },
    '/api/history/clear': {
      delete: {
        summary: 'Clear all conversations',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'All conversations cleared' }
        }
      }
    }
  }
};

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: `
      .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #3b82f6; }
      .swagger-ui { background-color: #0b0f19; color: #e2e8f0; }
      .swagger-ui .info .title { color: #60a5fa; }
      .swagger-ui .scheme-container { background: #1e293b; }
    `,
    customSiteTitle: 'Voiceflow AI - API Documentation & Swagger UI'
  }));
};

export default setupSwagger;
