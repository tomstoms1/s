import { 
  users, type User, type InsertUser,
  integrations, type Integration, type InsertIntegration,
  widgets, type Widget, type InsertWidget, type UpdateWidgetPosition
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Integration methods
  getIntegrationsByUserId(userId: number): Promise<Integration[]>;
  getIntegration(id: number): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, updates: Partial<Integration>): Promise<Integration | undefined>;
  deleteIntegration(id: number): Promise<boolean>;
  
  // Widget methods
  getWidgetsByUserId(userId: number): Promise<Widget[]>;
  getWidget(id: number): Promise<Widget | undefined>;
  createWidget(widget: InsertWidget): Promise<Widget>;
  updateWidget(id: number, updates: Partial<Widget>): Promise<Widget | undefined>;
  updateWidgetPosition(update: UpdateWidgetPosition): Promise<Widget | undefined>;
  deleteWidget(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private integrations: Map<number, Integration>;
  private widgets: Map<number, Widget>;
  private currentUserId: number;
  private currentIntegrationId: number;
  private currentWidgetId: number;

  constructor() {
    this.users = new Map();
    this.integrations = new Map();
    this.widgets = new Map();
    this.currentUserId = 1;
    this.currentIntegrationId = 1;
    this.currentWidgetId = 1;
    
    // Add a demo user for testing
    this.seedDemoUser();
  }
  
  private seedDemoUser() {
    const demoUser: User = {
      id: this.currentUserId++,
      username: "demo",
      password: "password123",
      email: "demo@example.com",
      fullName: "Demo User",
      createdAt: new Date()
    };
    
    this.users.set(demoUser.id, demoUser);
    
    // Add a default Trello integration for demo user
    const trelloIntegration: Integration = {
      id: this.currentIntegrationId++,
      userId: demoUser.id,
      type: 'trello',
      name: 'Trello',
      accessToken: process.env.TRELLO_TOKEN || '',
      refreshToken: null,
      connected: true,
      tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      lastSynced: new Date(),
      createdAt: new Date(),
    };
    this.integrations.set(trelloIntegration.id, trelloIntegration);
    
    // Add a Notion integration for demo user
    const notionIntegration: Integration = {
      id: this.currentIntegrationId++,
      userId: demoUser.id,
      type: 'notion',
      name: 'Notion',
      accessToken: process.env.NOTION_TOKEN || '',
      refreshToken: null,
      connected: !!process.env.NOTION_TOKEN,
      tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      lastSynced: new Date(),
      createdAt: new Date(),
    };
    this.integrations.set(notionIntegration.id, notionIntegration);
    
    // Add a default Trello widget for demo user
    const trelloWidget: Widget = {
      id: this.currentWidgetId++,
      userId: demoUser.id,
      type: 'trello-tasks',
      name: 'Trello Tasks',
      config: { integrationType: 'trello' },
      position: 0,
      gridPosition: { x: 0, y: 0, w: 1, h: 1 },
      createdAt: new Date(),
    };
    this.widgets.set(trelloWidget.id, trelloWidget);
    
    // Add a Notion widget if token is available
    if (process.env.NOTION_TOKEN) {
      const notionWidget: Widget = {
        id: this.currentWidgetId++,
        userId: demoUser.id,
        type: 'notion-pages',
        name: 'Notion Pages',
        config: { integrationType: 'notion' },
        position: 1,
        gridPosition: { x: 1, y: 0, w: 1, h: 1 },
        createdAt: new Date(),
      };
      this.widgets.set(notionWidget.id, notionWidget);
    }
    
    console.log("Demo user created:", demoUser.username);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  // Integration methods
  async getIntegrationsByUserId(userId: number): Promise<Integration[]> {
    return Array.from(this.integrations.values()).filter(
      (integration) => integration.userId === userId
    );
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    return this.integrations.get(id);
  }

  async createIntegration(insertIntegration: InsertIntegration & { userId?: number }): Promise<Integration> {
    const id = this.currentIntegrationId++;
    const createdAt = new Date();
    
    // Extract userId from input if provided
    const { userId, ...integrationData } = insertIntegration as any;
    
    const integration: Integration = { 
      ...integrationData,
      userId: userId,
      id, 
      createdAt,
      // Ensure these are set to null if not provided
      accessToken: integrationData.accessToken || null,
      refreshToken: integrationData.refreshToken || null,
      tokenExpiry: integrationData.tokenExpiry ? new Date(integrationData.tokenExpiry) : null,
      connected: integrationData.connected ?? false,
      lastSynced: integrationData.lastSynced ? new Date(integrationData.lastSynced) : null,
    };
    
    this.integrations.set(id, integration);
    return integration;
  }

  async updateIntegration(id: number, updates: Partial<Integration>): Promise<Integration | undefined> {
    const integration = this.integrations.get(id);
    if (!integration) return undefined;

    const updatedIntegration = { ...integration, ...updates };
    this.integrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    return this.integrations.delete(id);
  }

  // Widget methods
  async getWidgetsByUserId(userId: number): Promise<Widget[]> {
    return Array.from(this.widgets.values()).filter(
      (widget) => widget.userId === userId
    );
  }

  async getWidget(id: number): Promise<Widget | undefined> {
    return this.widgets.get(id);
  }

  async createWidget(insertWidget: InsertWidget & { userId?: number }): Promise<Widget> {
    const id = this.currentWidgetId++;
    const createdAt = new Date();
    
    // Extract userId from input if provided
    const { userId, ...widgetData } = insertWidget as any;
    
    const widget: Widget = { 
      ...widgetData,
      userId: userId,
      id, 
      createdAt,
      // Ensure these are set properly
      config: widgetData.config || {},
      position: widgetData.position ?? 0,
      gridPosition: widgetData.gridPosition || { x: 0, y: 0, w: 1, h: 1 },
    };
    
    this.widgets.set(id, widget);
    return widget;
  }

  async updateWidget(id: number, updates: Partial<Widget>): Promise<Widget | undefined> {
    const widget = this.widgets.get(id);
    if (!widget) return undefined;

    const updatedWidget = { ...widget, ...updates };
    this.widgets.set(id, updatedWidget);
    return updatedWidget;
  }

  async updateWidgetPosition(update: UpdateWidgetPosition): Promise<Widget | undefined> {
    const { id, gridPosition } = update;
    const widget = this.widgets.get(id);
    if (!widget) return undefined;

    const updatedWidget = { ...widget, gridPosition };
    this.widgets.set(id, updatedWidget);
    return updatedWidget;
  }

  async deleteWidget(id: number): Promise<boolean> {
    return this.widgets.delete(id);
  }
}

export const storage = new MemStorage();
