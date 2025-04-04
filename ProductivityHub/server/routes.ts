import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, loginUserSchema, 
  insertIntegrationSchema, insertWidgetSchema, 
  updateWidgetPositionSchema 
} from "@shared/schema";
import { ConnectorFactory } from "./lib/api-connectors";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import MemoryStore from "memorystore";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Set up session store
  const MemoryStoreSession = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "productivity-hub-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Set up passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username" });
        }

        // For the demo account, also allow direct password comparison
        if (username === 'demo' && password === 'demo') {
          return done(null, user);
        }

        // For all other accounts, use bcrypt for secure password validation
        if (username !== 'demo') {
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid password" });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Parse and validate the request body
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);

      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash the password before storing it
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userDataWithHashedPassword = {
        ...userData,
        password: hashedPassword
      };

      // Create the user with hashed password
      const user = await storage.createUser(userDataWithHashedPassword);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Create a default Trello integration for new users
      const trelloIntegration = await storage.createIntegration({
        type: 'trello',
        name: 'Trello',
        accessToken: process.env.TRELLO_TOKEN || '',
        refreshToken: null,
        connected: true,
        tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year in the future
        lastSynced: new Date().toISOString(),
        userId: user.id, // This will be ignored in the type parsing but used in implementation
      });

      // Create a default Notion integration for new users
      const notionIntegration = await storage.createIntegration({
        type: 'notion',
        name: 'Notion',
        accessToken: process.env.NOTION_TOKEN || '',
        refreshToken: null,
        connected: !!process.env.NOTION_TOKEN,
        tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year in the future
        lastSynced: new Date().toISOString(),
        userId: user.id, // This will be ignored in the type parsing but used in implementation
      });

      // Create a default Gmail integration for new users
      const gmailIntegration = await storage.createIntegration({
        type: 'gmail',
        name: 'Gmail',
        accessToken: process.env.GMAIL_TOKEN || '',
        refreshToken: null,
        connected: !!process.env.GMAIL_TOKEN,
        tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year in the future
        lastSynced: new Date().toISOString(),
        userId: user.id, // This will be ignored in the type parsing but used in implementation
      });

      // Add a default Trello widget
      // Get the first Trello board and list to use as default
      const trelloConnector = ConnectorFactory.createConnector("trello", trelloIntegration.accessToken);
      const boards = await (trelloConnector as any).getBoards();
      let defaultBoardId = '';
      let defaultListId = '';

      if (boards && boards.length > 0) {
        defaultBoardId = boards[0].id;
        const lists = await trelloConnector.getLists(defaultBoardId);
        if (lists && lists.length > 0) {
          defaultListId = lists[0].id;
        }
      }

      const widgetData = {
        type: 'trello-tasks',
        name: 'Trello Tasks',
        config: { 
          integrationType: 'trello',
          boardId: defaultBoardId,
          listId: defaultListId
        },
        position: 0,
        gridPosition: { x: 0, y: 0, w: 1, h: 1 },
      };

      // Add userId to the widgetData
      await storage.createWidget({
        type: widgetData.type,
        name: widgetData.name,
        config: widgetData.config as any,
        position: widgetData.position,
        gridPosition: widgetData.gridPosition,
        userId: user.id, // This will be used in implementation but not validated in schema
      });

      // Add a Notion widget if token is available
      if (process.env.NOTION_TOKEN) {
        const notionWidgetData = {
          type: 'notion-pages',
          name: 'Notion Pages',
          config: { integrationType: 'notion' },
          position: 1,
          gridPosition: { x: 1, y: 0, w: 1, h: 1 },
        };

        await storage.createWidget({
          type: notionWidgetData.type,
          name: notionWidgetData.name,
          config: notionWidgetData.config as any,
          position: notionWidgetData.position,
          gridPosition: notionWidgetData.gridPosition,
          userId: user.id,
        });
      }

      // Add a Gmail widget if token is available
      if (process.env.GMAIL_TOKEN) {
        const gmailWidgetData = {
          type: 'gmail',
          name: 'Gmail',
          config: { integrationType: 'gmail' },
          position: 2,
          gridPosition: { x: 0, y: 1, w: 1, h: 1 },
        };

        await storage.createWidget({
          type: gmailWidgetData.type,
          name: gmailWidgetData.name,
          config: gmailWidgetData.config as any,
          position: gmailWidgetData.position,
          gridPosition: gmailWidgetData.gridPosition,
          userId: user.id,
        });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error during login after registration" });
        }
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    try {
      const loginData = loginUserSchema.parse(req.body);

      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message || "Authentication failed" });
        }
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }

          // Remove password from response
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ authenticated: false });
    }

    const { password, ...user } = req.user as any;
    res.json({ authenticated: true, user });
  });

  // Integration routes
  app.get("/api/integrations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const integrations = await storage.getIntegrationsByUserId(userId);
      res.json(integrations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/integrations", isAuthenticated, async (req, res) => {
    try {
      // Extract userId from authenticated user session
      const userId = (req.user as any).id;

      // Log debug information
      console.log("Creating integration", { userId, body: req.body, user: req.user });

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated or user ID not found" });
      }

      // Parse the request body
      let data;
      try {
        data = insertIntegrationSchema.parse(req.body);

        // Convert string dates to Date objects if they exist
        // We need to handle this carefully for TypeScript compatibility
        const transformedData: any = { ...data };
        if (transformedData.tokenExpiry) {
          transformedData.tokenExpiry = new Date(transformedData.tokenExpiry);
        }
        if (transformedData.lastSynced) {
          transformedData.lastSynced = new Date(transformedData.lastSynced);
        }
        data = transformedData;
      } catch (parseError: any) {
        console.error("Schema validation error:", parseError);
        return res.status(400).json({ message: parseError.message });
      }

      // Add userId to the data that will be passed to storage
      const integrationData = { ...data, userId };

      // Create the integration
      const integration = await storage.createIntegration(integrationData);
      res.status(201).json(integration);
    } catch (error: any) {
      console.error("Error creating integration:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/integrations/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const integrationId = parseInt(req.params.id);
      const integration = await storage.getIntegration(integrationId);

      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      if (integration.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updatedIntegration = await storage.updateIntegration(integrationId, req.body);
      res.json(updatedIntegration);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/integrations/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const integrationId = parseInt(req.params.id);
      const integration = await storage.getIntegration(integrationId);

      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      if (integration.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteIntegration(integrationId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Widget routes
  app.get("/api/widgets", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const widgets = await storage.getWidgetsByUserId(userId);
      res.json(widgets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/widgets", isAuthenticated, async (req, res) => {
    try {
      // Extract userId from authenticated user session
      const userId = (req.user as any).id;

      // Log debug information
      console.log("Creating widget", { userId, body: req.body, user: req.user });

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated or user ID not found" });
      }

      // Parse the request body
      let data;
      try {
        data = insertWidgetSchema.parse(req.body);
      } catch (parseError: any) {
        console.error("Schema validation error:", parseError);
        return res.status(400).json({ message: parseError.message });
      }

      // Add userId to the data that will be passed to storage
      const widgetData = { ...data, userId };

      // Create the widget
      const widget = await storage.createWidget(widgetData);
      res.status(201).json(widget);
    } catch (error: any) {
      console.error("Error creating widget:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/widgets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const widgetId = parseInt(req.params.id);
      const widget = await storage.getWidget(widgetId);

      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      if (widget.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updatedWidget = await storage.updateWidget(widgetId, req.body);
      res.json(updatedWidget);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/widgets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const widgetId = parseInt(req.params.id);
      const widget = await storage.getWidget(widgetId);

      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      if (widget.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Extract update data (colorTheme, size, etc.)
      const { colorTheme, size } = req.body;

      // Update config object with appearance settings
      const currentConfig = widget.config || {};
      const updatedConfig = {
        ...currentConfig,
        ...(colorTheme && { colorTheme }),
        ...(size && { size })
      };

      const updates = {
        config: updatedConfig
      };

      const updatedWidget = await storage.updateWidget(widgetId, updates);
      res.json(updatedWidget);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/widgets/:id/position", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const widgetId = parseInt(req.params.id);
      const widget = await storage.getWidget(widgetId);

      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      if (widget.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const position = req.body.position || req.body.gridPosition;

      if (!position) {
        return res.status(400).json({ message: "Position data is required" });
      }

      const positionData = updateWidgetPositionSchema.parse({
        id: widgetId,
        gridPosition: position
      });

      const updatedWidget = await storage.updateWidgetPosition(positionData);
      res.json(updatedWidget);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/widgets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const widgetId = parseInt(req.params.id);
      const widget = await storage.getWidget(widgetId);

      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      if (widget.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteWidget(widgetId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // External API proxy routes for integration connectors
  app.get("/api/trello/cards", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const integrations = await storage.getIntegrationsByUserId(userId);
      const trelloIntegration = integrations.find(i => i.type === "trello" && i.connected);

      if (!trelloIntegration) {
        return res.status(404).json({ message: "Trello integration not found or not connected" });
      }

      const connector = ConnectorFactory.createConnector("trello", trelloIntegration.accessToken || undefined);
      const daysParam = req.query.days ? parseInt(req.query.days as string) : 7;
      const cards = await (connector as any).getCardsDueWithin(daysParam);

      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Direct API test endpoint - allows testing Trello integration without authentication
  // IMPORTANT: This would be removed in a production environment
  app.get("/api/test/trello", async (req, res) => {
    try {
      console.log("Testing direct Trello API access with environment variables");

      const connector = ConnectorFactory.createConnector("trello");
      const boards = await (connector as any).getBoards();

      if (boards && boards.length > 0) {
        const firstBoardId = boards[0].id;
        const lists = await (connector as any).getLists(firstBoardId);

        res.json({
          success: true,
          message: "Trello API connection successful",
          boards,
          lists: lists || []
        });
      } else {
        res.json({
          success: false,
          message: "No Trello boards found or API connection failed",
          boards: []
        });
      }
    } catch (error: any) {
      console.error("Trello API test error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message,
        error: error.toString() 
      });
    }
  });

  app.get("/api/notion/pages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const integrations = await storage.getIntegrationsByUserId(userId);
      const notionIntegration = integrations.find(i => i.type === "notion" && i.connected);

      if (!notionIntegration) {
        return res.status(404).json({ message: "Notion integration not found or not connected" });
      }

      const connector = ConnectorFactory.createConnector("notion", notionIntegration.accessToken || undefined);
      const limitParam = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const pages = await (connector as any).getRecentPages(limitParam);

      res.json(pages);
    } catch (error: any) {
      console.error("Error fetching Notion pages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notion/pages/:pageId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const pageId = req.params.pageId;

      if (!pageId) {
        return res.status(400).json({ message: "Page ID is required" });
      }

      // Validate the user has a Notion integration
      const integrations = await storage.getIntegrationsByUserId(userId);
      const notionIntegration = integrations.find(i => i.type === "notion" && i.connected);

      if (!notionIntegration) {
        return res.status(404).json({ message: "Notion integration not found or not connected" });
      }

      // Get the page content
      const connector = ConnectorFactory.createConnector("notion", notionIntegration.accessToken || undefined);
      const pageContent = await (connector as any).getPageContent(pageId);

      res.json(pageContent);
    } catch (error: any) {
      console.error(`Error fetching Notion page content for page ${req.params.pageId}:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Gmail API routes
  app.get("/api/gmail/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const view = req.query.view || 'recent';

      // Validate the user has a Gmail integration
      const integrations = await storage.getIntegrationsByUserId(userId);
      const gmailIntegration = integrations.find(i => i.type === "gmail" && i.connected);

      if (!gmailIntegration) {
        return res.status(404).json({ message: "Gmail integration not found or not connected" });
      }

      const connector = ConnectorFactory.createConnector("gmail", gmailIntegration.accessToken || undefined);

      let messages = [];
      if (view === 'unread') {
        messages = await (connector as any).getUnreadEmails();
      } else {
        messages = await (connector as any).getRecentEmails(10);
      }

      res.json(messages);
    } catch (error: any) {
      console.error(`Error fetching Gmail messages: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  });

  // Endpoint for creating a Trello card from an email
  app.post("/api/gmail/create-task", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { emailId } = req.body;

      if (!emailId) {
        return res.status(400).json({ message: "Email ID is required" });
      }

      // Get user integrations
      const integrations = await storage.getIntegrationsByUserId(userId);
      const gmailIntegration = integrations.find(i => i.type === "gmail" && i.connected);
      const trelloIntegration = integrations.find(i => i.type === "trello" && i.connected);

      if (!gmailIntegration) {
        return res.status(404).json({ message: "Gmail integration not found or not connected" });
      }

      if (!trelloIntegration) {
        return res.status(404).json({ message: "Trello integration not found or not connected" });
      }

      // Get the first available Trello list for tasks
      const trelloConnector = ConnectorFactory.createConnector("trello", trelloIntegration.accessToken);
      const boards = await (trelloConnector as any).getBoards();

      if (!boards || boards.length === 0) {
        return res.status(400).json({ message: "No Trello boards found" });
      }

      const lists = await (trelloConnector as any).getLists(boards[0].id);
      if (!lists || lists.length === 0) {
        return res.status(400).json({ message: "No Trello lists found" });
      }

      const defaultListId = lists[0].id;


      // Create connectors and convert email to Trello card
      const gmailConnector = ConnectorFactory.createConnector("gmail", gmailIntegration.accessToken || undefined) as any;
      const card = await gmailConnector.createTrelloCardFromEmail(emailId, trelloConnector, defaultListId);

      if (!card) {
        return res.status(500).json({ message: "Failed to create Trello card from email" });
      }

      res.status(201).json(card);
    } catch (error: any) {
      console.error(`Error creating task from email: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  });

  // Direct API test endpoints for services - allows testing integrations without authentication
  // IMPORTANT: These would be removed in a production environment
  app.get("/api/test/notion", async (req, res) => {
    try {
      console.log("Testing direct Notion API access with environment variables");

      const connector = ConnectorFactory.createConnector("notion", process.env.NOTION_TOKEN);
      const pages = await (connector as any).getRecentPages(5);

      if (pages && pages.length > 0) {
        res.json({
          success: true,
          message: "Notion API connection successful",
          pages
        });
      } else {
        res.json({
          success: false,
          message: "No Notion pages found or API connection failed",
          pages: []
        });
      }
    } catch (error: any) {
      console.error("Notion API test error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message,
        error: error.toString() 
      });
    }
  });

  // Direct API test endpoint for Trello - allows testing Trello integration without authentication
  // IMPORTANT: This would be removed in a production environment
  app.get("/api/test/trello", async (req, res) => {
    try {
      console.log("Testing direct Trello API access with environment variables");

      const connector = ConnectorFactory.createConnector("trello", process.env.TRELLO_TOKEN);
      const boards = await (connector as any).getBoards();

      if (boards && boards.length > 0) {
        res.json({
          success: true,
          message: "Trello API connection successful",
          boards
        });
      } else {
        res.json({
          success: false,
          message: "No Trello boards found or API connection failed",
          boards: []
        });
      }
    } catch (error: any) {
      console.error("Trello API test error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message,
        error: error.toString() 
      });
    }
  });

  // Direct API test endpoint for Gmail - allows testing Gmail integration without authentication
  // IMPORTANT: This would be removed in a production environment
  app.get("/api/test/gmail", async (req, res) => {
    try {
      console.log("Testing direct Gmail API access with environment variables");

      const connector = ConnectorFactory.createConnector("gmail", process.env.GMAIL_API_TOKEN);
      const messages = await (connector as any).getRecentEmails(5);

      if (messages && messages.length > 0) {
        res.json({
          success: true,
          message: "Gmail API connection successful",
          messages
        });
      } else {
        res.json({
          success: false,
          message: "No Gmail messages found or API connection failed",
          messages: []
        });
      }
    } catch (error: any) {
      console.error("Gmail API test error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message,
        error: error.toString() 
      });
    }
  });

  return httpServer;
}