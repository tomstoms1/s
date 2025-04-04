import { z } from "zod";

// Type definitions for external API data
export type TrelloCard = {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dueComplete: boolean;
  idBoard: string;
  idList: string;
  labels: Array<{ id: string; name: string; color: string }>;
};

export type TrelloBoard = {
  id: string;
  name: string;
  shortUrl: string;
};

export type TrelloList = {
  id: string;
  name: string;
  idBoard: string;
};

export type NotionPage = {
  id: string;
  title: string;
  icon?: { type: string; emoji?: string };
  lastEditedTime: string;
  url: string;
};

export type GmailMessage = {
  id: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
  };
  internalDate: string;
  labelIds: string[];
  from?: string;
  subject?: string;
};

// Mock connector classes - in a real implementation these would
// make actual API requests to the respective services

export class TrelloConnector {
  private token: string;
  private apiKey: string;
  private baseUrl: string = 'https://api.trello.com/1';
  
  constructor(token?: string) {
    // Use the provided token if available, otherwise fall back to env vars
    this.token = token || process.env.TRELLO_TOKEN || '';
    this.apiKey = process.env.TRELLO_API_KEY || '';
    
    if (!this.token || !this.apiKey) {
      console.warn('Trello API key or token not configured');
    } else {
      console.log('Trello API key and token configured with lengths:', 
        this.apiKey.length, this.token.length);
    }
  }
  
  private getAuthQueryParams(): string {
    return `key=${this.apiKey}&token=${this.token}`;
  }
  
  async fetchFromTrello(endpoint: string): Promise<any> {
    try {
      // Check if the endpoint already has query parameters
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}${endpoint}${separator}${this.getAuthQueryParams()}`;
      
      // Log the request (hiding sensitive information)
      console.log(`Fetching from Trello API: ${url.replace(/key=.*?&token=.*?(&|$)/, 'key=***&token=***$1')}`);
      
      // Print the actual API key and token length to debug (without revealing values)
      console.log(`Debug - API key length: ${this.apiKey?.length || 0}, Token length: ${this.token?.length || 0}`);
      
      const response = await fetch(url);
      
      // Log response status
      console.log(`Trello API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Trello API error details: ${errorText}`);
        throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in fetchFromTrello:', error);
      throw error;
    }
  }
  
  async getBoards(): Promise<TrelloBoard[]> {
    try {
      const data = await this.fetchFromTrello('/members/me/boards?fields=id,name,shortUrl');
      return data;
    } catch (error) {
      console.error('Error fetching Trello boards:', error);
      return [];
    }
  }
  
  async getLists(boardId: string): Promise<TrelloList[]> {
    try {
      const data = await this.fetchFromTrello(`/boards/${boardId}/lists?fields=id,name,idBoard`);
      return data;
    } catch (error) {
      console.error(`Error fetching lists for board ${boardId}:`, error);
      return [];
    }
  }
  
  async getCardsOnList(listId: string): Promise<TrelloCard[]> {
    try {
      const data = await this.fetchFromTrello(`/lists/${listId}/cards?fields=id,name,desc,due,dueComplete,idBoard,idList,labels`);
      return data;
    } catch (error) {
      console.error(`Error fetching cards for list ${listId}:`, error);
      return [];
    }
  }
  
  async getCardsDueWithin(days: number): Promise<TrelloCard[]> {
    try {
      // First get all boards
      const boards = await this.getBoards();
      
      if (boards.length === 0) {
        console.log("No Trello boards found - returning empty cards array");
        return [];
      }
      
      // Get all lists from each board to determine card status later
      const boardLists: Record<string, Record<string, string>> = {};
      for (const board of boards) {
        const lists = await this.getLists(board.id);
        boardLists[board.id] = {};
        
        for (const list of lists) {
          // Map list IDs to list names for status lookup
          boardLists[board.id][list.id] = list.name;
        }
      }
      
      // For each board, get all cards with due dates
      let allCards: any[] = [];
      
      for (const board of boards) {
        const boardCards = await this.fetchFromTrello(
          `/boards/${board.id}/cards?fields=id,name,desc,due,dueComplete,idBoard,idList,labels`
        );
        
        // Enhance cards with status from list name
        const enhancedCards = boardCards.map((card: TrelloCard) => {
          // Get the list name based on idList and use it as status
          const listName = boardLists[card.idBoard]?.[card.idList] || 'Unknown';
          
          return {
            ...card,
            status: listName,
            members: [] // Add empty members for now (could be expanded in a future version)
          };
        });
        
        allCards = [...allCards, ...enhancedCards];
      }
      
      // Filter cards with due dates in the next X days
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);
      
      return allCards.filter((card: any) => {
        if (!card.due) return false;
        
        const cardDueDate = new Date(card.due);
        return cardDueDate >= now && cardDueDate <= futureDate;
      });
    } catch (error) {
      console.error(`Error fetching cards due within ${days} days:`, error);
      return [];
    }
  }
  
  async createCard(listId: string, card: { name: string; desc?: string; due?: string }): Promise<TrelloCard | null> {
    try {
      const url = `${this.baseUrl}/cards?${this.getAuthQueryParams()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idList: listId,
          name: card.name,
          desc: card.desc || '',
          due: card.due,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create card: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error creating Trello card:', error);
      return null;
    }
  }
}

export class NotionConnector {
  private token?: string;
  private baseUrl: string = 'https://api.notion.com/v1';
  
  constructor(token?: string) {
    this.token = token || process.env.NOTION_TOKEN || '';
    
    if (!this.token) {
      console.warn('Notion API token not configured');
    }
  }
  
  private async fetchFromNotion(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      // Log the request (hiding sensitive information)
      console.log(`Fetching from Notion API: ${url}`);
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      };
      
      const options: RequestInit = {
        method,
        headers
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, options);
      
      // Log response status
      console.log(`Notion API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Notion API error details: ${errorText}`);
        throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in fetchFromNotion:', error);
      throw error;
    }
  }
  
  async getRecentPages(limit = 5): Promise<NotionPage[]> {
    try {
      // Since direct recent pages endpoint doesn't exist, we use search with sorting
      const requestBody = {
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        },
        page_size: limit
      };
      
      console.log('Notion search request body:', JSON.stringify(requestBody, null, 2));
      
      const data = await this.fetchFromNotion('/search', 'POST', requestBody);
      
      // Log the raw response for debugging
      console.log('Notion search response:', JSON.stringify({
        object: data.object,
        resultsCount: data.results?.length || 0,
        nextCursor: data.next_cursor,
        hasMore: data.has_more,
        type: data.type
      }, null, 2));
      
      if (!data.results || data.results.length === 0) {
        console.log('No results found in Notion response');
        return [];
      }
      
      // Log the first result to understand the structure
      console.log('First result sample:', JSON.stringify({
        id: data.results[0].id,
        object: data.results[0].object,
        properties: Object.keys(data.results[0].properties || {}),
        url: data.results[0].url
      }, null, 2));
      
      // Transform the results to match our NotionPage type
      return data.results.map((page: any) => {
        // Extract title from properties
        let title = 'Untitled';
        try {
          // For database items
          if (page.properties) {
            // Try to find a title-like property (title, Name, name, etc.)
            const titleProperty = 
              page.properties.title || 
              page.properties.Title || 
              page.properties.Name || 
              page.properties.name || 
              Object.values(page.properties).find((p: any) => p.type === 'title');
            
            if (titleProperty) {
              if (titleProperty.title && Array.isArray(titleProperty.title)) {
                title = titleProperty.title.map((t: any) => t.plain_text || '').join('');
              } else if (titleProperty.rich_text && Array.isArray(titleProperty.rich_text)) {
                title = titleProperty.rich_text.map((t: any) => t.plain_text || '').join('');
              }
            } else if (page.properties) {
              // If no obvious title property, use the first property that has content
              // Instead of trying to find based on content presence, just use the first property
              // that contains either title or rich_text
              const propertyValues = Object.values(page.properties) as any[];
              
              for (const prop of propertyValues) {
                if (prop.title && Array.isArray(prop.title) && prop.title.length > 0) {
                  title = prop.title.map((t: any) => t.plain_text || '').join('');
                  break;
                } else if (prop.rich_text && Array.isArray(prop.rich_text) && prop.rich_text.length > 0) {
                  title = prop.rich_text.map((t: any) => t.plain_text || '').join('');
                  break;
                }
              }
            }
          }
          
          // For pages with child_page structure
          if (page.child_page && page.child_page.title) {
            title = page.child_page.title;
          }
        } catch (err) {
          console.error('Error extracting title from Notion page:', err);
          // Fallback to page ID if title extraction fails
          title = `Page ${page.id.substring(0, 8)}`;
        }
        
        return {
          id: page.id,
          title,
          icon: page.icon,
          lastEditedTime: page.last_edited_time,
          url: page.url
        };
      });
    } catch (error) {
      console.error('Error fetching Notion pages:', error);
      // Return an empty array to avoid breaking the UI in case of errors
      return [];
    }
  }
  
  async searchPages(query: string): Promise<NotionPage[]> {
    try {
      const requestBody = {
        query,
        page_size: 10,
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      };
      
      console.log('Notion search query request:', JSON.stringify(requestBody, null, 2));
      
      const data = await this.fetchFromNotion('/search', 'POST', requestBody);
      
      if (!data.results || data.results.length === 0) {
        console.log('No results found in Notion query response');
        return [];
      }
      
      // Use the same page parsing logic as in getRecentPages
      return data.results.map((page: any) => {
        let title = 'Untitled';
        try {
          if (page.properties) {
            const titleProperty = 
              page.properties.title || 
              page.properties.Title || 
              page.properties.Name || 
              page.properties.name;
            
            if (titleProperty) {
              if (titleProperty.title && Array.isArray(titleProperty.title)) {
                title = titleProperty.title.map((t: any) => t.plain_text || '').join('');
              } else if (titleProperty.rich_text && Array.isArray(titleProperty.rich_text)) {
                title = titleProperty.rich_text.map((t: any) => t.plain_text || '').join('');
              }
            } else {
              // If no direct title property, search all properties
              const propertyValues = Object.values(page.properties) as any[];
              
              for (const prop of propertyValues) {
                if (prop.title && Array.isArray(prop.title) && prop.title.length > 0) {
                  title = prop.title.map((t: any) => t.plain_text || '').join('');
                  break;
                } else if (prop.rich_text && Array.isArray(prop.rich_text) && prop.rich_text.length > 0) {
                  title = prop.rich_text.map((t: any) => t.plain_text || '').join('');
                  break;
                }
              }
            }
          }
          
          // For pages with child_page structure
          if (page.child_page && page.child_page.title) {
            title = page.child_page.title;
          }
        } catch (err) {
          console.error('Error extracting title from Notion page:', err);
          title = `Page ${page.id.substring(0, 8)}`;
        }
        
        return {
          id: page.id,
          title,
          icon: page.icon,
          lastEditedTime: page.last_edited_time,
          url: page.url
        };
      });
    } catch (error) {
      console.error('Error searching Notion pages:', error);
      return [];
    }
  }
  
  async createPage(title: string, parentId?: string): Promise<NotionPage | null> {
    try {
      // parentId is required for creating pages in Notion
      if (!parentId) {
        throw new Error('Parent ID is required to create a Notion page');
      }
      
      const data = await this.fetchFromNotion('/pages', 'POST', {
        parent: {
          page_id: parentId
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title
                }
              }
            ]
          }
        }
      });
      
      return {
        id: data.id,
        title,
        lastEditedTime: data.last_edited_time,
        url: data.url
      };
    } catch (error) {
      console.error('Error creating Notion page:', error);
      return null;
    }
  }
  
  async getPageContent(pageId: string): Promise<any> {
    try {
      console.log(`Fetching content for Notion page ${pageId}`);
      
      // First, retrieve the basic page information
      const pageData = await this.fetchFromNotion(`/pages/${pageId}`);
      
      // Then, retrieve the page content blocks
      const blocksData = await this.fetchFromNotion(`/blocks/${pageId}/children`);
      
      // Process blocks to make them more user-friendly
      const processedBlocks = (blocksData.results || []).map((block: any) => {
        // Extract the block type and content
        const blockType = block.type;
        const content = block[blockType];
        
        return {
          id: block.id,
          type: blockType,
          content: content,
          // For paragraph, heading, etc. blocks, extract the plain text content for easier display
          text: content?.rich_text?.map((t: any) => t.plain_text || '').join('') || '',
          has_children: block.has_children
        };
      });
      
      return {
        page: pageData,
        blocks: processedBlocks
      };
    } catch (error) {
      console.error(`Error fetching Notion page content for page ${pageId}:`, error);
      throw error;
    }
  }
}

export class GmailConnector {
  private token?: string;
  private baseUrl: string = 'https://www.googleapis.com/gmail/v1';
  
  constructor(token?: string) {
    // Use the provided token if available, otherwise fall back to env vars
    this.token = token || process.env.GMAIL_API_TOKEN || '';
    
    if (!this.token) {
      console.warn('Gmail API token not configured');
    } else {
      console.log('Gmail API token configured with length:', this.token.length);
    }
  }
  
  private async fetchFromGmail(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    try {
      if (!this.token) {
        console.error('Gmail API token not provided');
        throw new Error('Gmail API token is required');
      }
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      };
      
      const options: RequestInit = {
        method,
        headers
      };
      
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }
      
      console.log(`Fetching from Gmail API: ${this.baseUrl}${endpoint}`);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      
      console.log(`Gmail API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response from Gmail API: ${errorText}`);
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching from Gmail API:', error);
      throw error;
    }
  }
  
  private processMessage(message: any): GmailMessage {
    // Extract from, subject from headers
    const from = message.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
    const subject = message.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
    
    return {
      id: message.id,
      from,
      subject,
      snippet: message.snippet || '',
      payload: message.payload || { headers: [] },
      internalDate: message.internalDate || '',
      labelIds: message.labelIds || []
    };
  }
  
  async getRecentEmails(limit = 5): Promise<GmailMessage[]> {
    try {
      const data = await this.fetchFromGmail('/users/me/messages?maxResults=' + limit);
      
      if (!data.messages || data.messages.length === 0) {
        console.log('No messages found in Gmail response');
        return [];
      }
      
      // For each message ID, fetch the complete message
      const messages = await Promise.all(
        data.messages.map(async (msg: any) => {
          const fullMsg = await this.fetchFromGmail(`/users/me/messages/${msg.id}`);
          return this.processMessage(fullMsg);
        })
      );
      
      return messages;
    } catch (error) {
      console.error('Error fetching Gmail messages:', error);
      return [];
    }
  }
  
  async getUnreadEmails(): Promise<GmailMessage[]> {
    try {
      const data = await this.fetchFromGmail('/users/me/messages?q=is:unread');
      
      if (!data.messages || data.messages.length === 0) {
        console.log('No unread messages found in Gmail');
        return [];
      }
      
      // For each message ID, fetch the complete message
      const messages = await Promise.all(
        data.messages.map(async (msg: any) => {
          const fullMsg = await this.fetchFromGmail(`/users/me/messages/${msg.id}`);
          return this.processMessage(fullMsg);
        })
      );
      
      return messages;
    } catch (error) {
      console.error('Error fetching unread Gmail messages:', error);
      return [];
    }
  }
  
  async searchEmails(query: string): Promise<GmailMessage[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const data = await this.fetchFromGmail(`/users/me/messages?q=${encodedQuery}`);
      
      if (!data.messages || data.messages.length === 0) {
        console.log('No messages found in Gmail search');
        return [];
      }
      
      // For each message ID, fetch the complete message
      const messages = await Promise.all(
        data.messages.map(async (msg: any) => {
          const fullMsg = await this.fetchFromGmail(`/users/me/messages/${msg.id}`);
          return this.processMessage(fullMsg);
        })
      );
      
      return messages;
    } catch (error) {
      console.error('Error searching Gmail messages:', error);
      return [];
    }
  }
  
  // Create a Trello card from an email
  async createTrelloCardFromEmail(
    emailId: string, 
    trelloConnector: TrelloConnector, 
    listId: string
  ): Promise<TrelloCard | null> {
    try {
      // Get the email details
      const email = await this.fetchFromGmail(`/users/me/messages/${emailId}`);
      const processedEmail = this.processMessage(email);
      
      // Extract potential date from email content
      const datePattern = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(\w+ \d{1,2}(?:st|nd|rd|th)?, \d{4})/i;
      const timePattern = /(\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?)/;
      
      let dueDate: string | undefined;
      const dateMatch = processedEmail.snippet.match(datePattern);
      const timeMatch = processedEmail.snippet.match(timePattern);
      
      if (dateMatch) {
        const date = new Date(dateMatch[0]);
        if (timeMatch) {
          const timeParts = timeMatch[1].split(':');
          let hours = parseInt(timeParts[0]);
          const minutes = parseInt(timeParts[1]);
          if (timeMatch[1].toLowerCase().includes('pm') && hours < 12) {
            hours += 12;
          }
          date.setHours(hours, minutes);
        }
        dueDate = date.toISOString();
      }
      
      // Extract instruction/action from email content
      const instructionMatch = processedEmail.snippet.match(/(please|kindly)\s+(\w+).*?[.?!]/i);
      const instruction = instructionMatch ? instructionMatch[0] : '';

      // Create card description with structured information
      const description = `Re: ${processedEmail.subject || 'No Subject'}\n` +
        `From: ${processedEmail.from || 'Unknown'}\n` +
        `${instruction ? `Action: ${instruction}\n` : ''}` +
        `${dueDate ? `Due: ${new Date(dueDate).toLocaleString()}` : ''}`;
      
      // Create card in Trello
      const card = await trelloConnector.createCard(listId, {
        name: processedEmail.subject || 'No Subject',
        desc: description,
        due: dueDate
      });
      
      return card;
    } catch (error) {
      console.error('Error creating Trello card from email:', error);
      return null;
    }
  }
}

// Factory class to create appropriate connector based on integration type
export class ConnectorFactory {
  static createConnector(type: string, token?: string) {
    switch (type.toLowerCase()) {
      case 'trello':
        return new TrelloConnector(token);
      case 'notion':
        return new NotionConnector(token);
      case 'gmail':
        return new GmailConnector(token);
      default:
        throw new Error(`Unsupported integration type: ${type}`);
    }
  }
}
