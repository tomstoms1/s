import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ExternalLink, FileText } from "lucide-react";

interface NotionPageViewProps {
  pageId: string;
  onBack: () => void;
}

interface NotionPageContent {
  page: any;
  blocks: Array<{
    id: string;
    type: string;
    text: string;
    content: any;
    has_children: boolean;
  }>;
}

export function NotionPageView({ pageId, onBack }: NotionPageViewProps) {
  const [pageContent, setPageContent] = useState<NotionPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Make the API request to get the page content
        const data = await apiRequest('GET', `/api/notion/pages/${pageId}`);
        
        // Update state with the response data
        setPageContent(data);
      } catch (err: any) {
        console.error("Error fetching Notion page content:", err);
        setError(err.message || "Error loading page content");
      } finally {
        setLoading(false);
      }
    };

    if (pageId) {
      fetchPageContent();
    }
  }, [pageId]);

  // Extract title from page properties
  const getPageTitle = () => {
    if (!pageContent?.page) return "Loading...";
    
    // Try to get title from properties
    const titleProp = pageContent.page.properties?.title;
    if (titleProp) {
      const titleArr = titleProp.title || [];
      return titleArr.map((t: any) => t.plain_text || "").join("");
    }
    
    // Fallback for page title if properties structure is different
    return "Notion Page";
  };

  // Function to render different block types
  const renderBlock = (block: any) => {
    if (!block) return null;
    
    switch (block.type) {
      case "paragraph":
        return <p className="my-2 text-sm">{block.text}</p>;
      case "heading_1":
        return <h1 className="text-2xl font-bold mt-6 mb-2">{block.text}</h1>;
      case "heading_2":
        return <h2 className="text-xl font-bold mt-5 mb-2">{block.text}</h2>;
      case "heading_3":
        return <h3 className="text-lg font-bold mt-4 mb-2">{block.text}</h3>;
      case "bulleted_list_item":
        return <li className="ml-6 text-sm list-disc my-1">{block.text}</li>;
      case "numbered_list_item":
        return <li className="ml-6 text-sm list-decimal my-1">{block.text}</li>;
      case "to_do":
        return (
          <div className="flex items-start gap-2 my-2">
            <input 
              type="checkbox" 
              checked={block.content?.checked || false} 
              readOnly 
              className="mt-1"
            />
            <span className="text-sm">{block.text}</span>
          </div>
        );
      case "toggle":
        return (
          <details className="my-2 p-2 border border-gray-200 rounded-md">
            <summary className="cursor-pointer font-medium">{block.text}</summary>
            <div className="pl-4 pt-2 text-sm">
              {block.has_children ? "Contains nested content..." : ""}
            </div>
          </details>
        );
      case "divider":
        return <hr className="my-4" />;
      case "code":
        return (
          <pre className="bg-gray-100 p-3 rounded my-3 overflow-x-auto">
            <code className="text-sm">{block.text}</code>
          </pre>
        );
      case "image":
        const imageUrl = block.content?.file?.url || block.content?.external?.url;
        return imageUrl ? (
          <div className="my-4">
            <img 
              src={imageUrl} 
              alt="Embedded image" 
              className="max-w-full rounded-md"
            />
            {block.content?.caption && (
              <p className="text-xs text-gray-500 mt-1">{block.content.caption}</p>
            )}
          </div>
        ) : null;
      default:
        if (block.text) {
          return <p className="my-2 text-sm text-gray-600">{block.text}</p>;
        }
        return <p className="my-2 text-xs text-gray-400">[{block.type} block]</p>;
    }
  };

  // Group list items for proper rendering
  const renderBlocks = () => {
    if (!pageContent?.blocks) return null;
    
    const renderedContent: JSX.Element[] = [];
    let listType: string | null = null;
    let listItems: JSX.Element[] = [];
    
    pageContent.blocks.forEach((block, index) => {
      // Handle lists specially to group them
      if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
        if (listType !== block.type && listItems.length > 0) {
          // Close previous list and start a new one
          renderedContent.push(
            <ul key={`list-${index}-${listType}`} className={listType === "numbered_list_item" ? "list-decimal" : "list-disc"}>
              {listItems}
            </ul>
          );
          listItems = [];
        }
        listType = block.type;
        listItems.push(
          <li key={block.id} className="ml-6 text-sm my-1">
            {block.text}
          </li>
        );
      } else {
        // If we were building a list and now have a different block type, add the list
        if (listItems.length > 0) {
          renderedContent.push(
            <ul key={`list-${index}-end`} className={listType === "numbered_list_item" ? "list-decimal" : "list-disc"}>
              {listItems}
            </ul>
          );
          listItems = [];
          listType = null;
        }
        
        // Add the non-list block
        renderedContent.push(
          <div key={block.id}>
            {renderBlock(block)}
          </div>
        );
      }
    });
    
    // Add any remaining list items
    if (listItems.length > 0) {
      renderedContent.push(
        <ul key="list-end" className={listType === "numbered_list_item" ? "list-decimal" : "list-disc"}>
          {listItems}
        </ul>
      );
    }
    
    return renderedContent;
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="flex items-center text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          
          {pageContent?.page?.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(pageContent.page.url, '_blank')}
              className="flex items-center text-gray-500 hover:text-gray-900"
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              Open in Notion
            </Button>
          )}
        </div>
        <CardTitle className="mt-2 flex items-center">
          <FileText className="mr-2 h-5 w-5 text-blue-500" />
          {loading ? "Loading..." : getPageTitle()}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 px-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 rounded-md bg-red-50">
            <p className="font-medium">Error loading page content</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-sm mt-2">
              Make sure this page is shared with your integration. Open the page in Notion, click "Share",
              and add the Productivity Hub integration.
            </p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            {renderBlocks()}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="bg-gray-50 border-t border-gray-100 justify-between p-3">
        <div className="text-xs text-gray-500">
          {!loading && pageContent?.page?.last_edited_time && (
            <>
              Last edited: {new Date(pageContent.page.last_edited_time).toLocaleString()}
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>Close</Button>
      </CardFooter>
    </Card>
  );
}