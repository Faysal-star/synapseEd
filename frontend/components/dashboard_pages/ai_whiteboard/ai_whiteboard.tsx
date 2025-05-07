"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Tldraw,
  TLUiOverrides,
  toRichText,
  AssetRecordType,
  getHashForString,
  TLAssetStore,
  TLBookmarkAsset,
  uniqueId,
} from "tldraw";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import dynamic from "next/dynamic";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Loader2, Send, PlusCircle, Camera } from "lucide-react";
import { fill } from "@tensorflow/tfjs";

// Dynamically import the code editor to avoid SSR issues
const CodeEditor = dynamic(
  () => import("@uiw/react-textarea-code-editor").then((mod) => mod.default),
  { ssr: false }
);

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:5858";
const roomId = "test-room";

const multiplayerAssets: TLAssetStore = {
  async upload(_asset, file) {
    const id = uniqueId();
    const objectName = `${id}-${file.name}`;
    const url = `${WORKER_URL}/uploads/${encodeURIComponent(objectName)}`;

    const response = await fetch(url, {
      method: "PUT",
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`);
    }

    return { src: url };
  },
  resolve(asset) {
    return asset.props.src;
  },
};

async function unfurlBookmarkUrl({
  url,
}: {
  url: string;
}): Promise<TLBookmarkAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: "asset",
    type: "bookmark",
    meta: {},
    props: {
      src: url,
      description: "",
      image: "",
      favicon: "",
      title: "",
    },
  };

  try {
    const response = await fetch(
      `${WORKER_URL}/unfurl?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();

    asset.props.description = data?.description ?? "";
    asset.props.image = data?.image ?? "";
    asset.props.favicon = data?.favicon ?? "";
    asset.props.title = data?.title ?? "";
  } catch (e) {
    console.error(e);
  }

  return asset;
}

export default function AIWhiteboard() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [diagramDescription, setDiagramDescription] = useState("");
  const [mermaidCode, setMermaidCode] = useState("");
  const [renderedSVG, setRenderedSVG] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const store = useSync({
    uri: `${WORKER_URL}/connect/${roomId}`,
    assets: multiplayerAssets,
  });

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "dark",
      themeVariables: {
        darkMode: true,
        background: "#000000",
        primaryColor: "#ffffff",
        primaryTextColor: "#ffffff",
        primaryBorderColor: "#333333",
        lineColor: "#ffffff",
        secondaryColor: "#333333",
        tertiaryColor: "#111111",
      },
      fontFamily: "system-ui, sans-serif",
      securityLevel: "loose",
    });
  }, []);

  const renderMermaid = useCallback(async () => {
    if (!mermaidCode || !mermaidContainerRef.current) return;

    try {
      // Clear previous content
      mermaidContainerRef.current.innerHTML = "";

      // Use a unique ID for each render to avoid conflicts
      const uniqueId = `mermaid-diagram-${Date.now()}`;

      // Render mermaid diagram
      const { svg } = await mermaid.render(uniqueId, mermaidCode);
      mermaidContainerRef.current.innerHTML = svg;
      setRenderedSVG(svg);
    } catch (error) {
      console.error("Failed to render mermaid diagram:", error);
      mermaidContainerRef.current.innerHTML =
        '<div class="text-red-500">Error rendering diagram. Please check your syntax.</div>';
    }
  }, [mermaidCode]);

  useEffect(() => {
    if (mermaidCode) {
      renderMermaid();
    }
  }, [mermaidCode, renderMermaid]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/whiteboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, type: "message" }),
      });

      const data = await response.json();

      if (data.success && editorRef.current) {
        // Add text to the whiteboard
        const editor = editorRef.current;
        const { width, height } = editor.getViewportScreenBounds();

        // Create a note shape with the AI response
        editor.createShape({
          type: "note",
          x: width / 2 - 100,
          y: height / 2 - 20,
          props: {
            richText: toRichText(data.text), // this has to be a RichText object must
            color: "white", // Black for the ShadCn aesthetic
            size: "m",
          },
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setMessage("");
      setIsLoading(false);
    }
  };

  const handleDiagramRequest = async () => {
    if (!diagramDescription.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/whiteboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: diagramDescription, type: "diagram" }),
      });

      const data = await response.json();

      if (data.success) {
        setMermaidCode(data.mermaidCode);
        // Ensure we wait a moment for state to update before rendering
        setTimeout(() => renderMermaid(), 50);
      }
    } catch (error) {
      console.error("Error generating diagram:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertDiagram = useCallback(() => {
    if (renderedSVG && editorRef.current) {
      try {
        const editor = editorRef.current;
        const { width, height } = editor.getViewportScreenBounds();

        // Create a temporary DOM element to parse the SVG dimensions
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(renderedSVG, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        // Get SVG dimensions from viewBox or width/height attributes
        let svgWidth = parseFloat(svgElement.getAttribute("width") || "300");
        let svgHeight = parseFloat(svgElement.getAttribute("height") || "200");

        // If there's a viewBox, use that for dimensions
        const viewBox = svgElement.getAttribute("viewBox");
        if (viewBox) {
          const [, , vbWidth, vbHeight] = viewBox.split(" ").map(parseFloat);
          if (!isNaN(vbWidth) && !isNaN(vbHeight)) {
            svgWidth = vbWidth;
            svgHeight = vbHeight;
          }
        }

        // Calculate aspect ratio
        const aspectRatio = svgWidth / svgHeight;

        // Set dimensions while preserving aspect ratio
        // Use a maximum width of 500px for better visibility
        const maxWidth = Math.min(500, width * 0.6);
        const imageWidth = maxWidth;
        const imageHeight = maxWidth / aspectRatio;

        // Convert SVG to base64 data URL
        const svgBase64 = `data:image/svg+xml;base64,${btoa(
          unescape(encodeURIComponent(renderedSVG))
        )}`;

        // Create a temporary image to ensure the SVG loads properly
        const img = new Image();
        img.onload = () => {
          // Create asset ID first
          const assetId = AssetRecordType.createId();

          // First create the asset record with base64 data URL
          editor.createAssets([
            {
              id: assetId,
              type: "image",
              typeName: "asset",
              props: {
                name: "diagram.svg",
                src: svgBase64,
                w: imageWidth,
                h: imageHeight,
                mimeType: "image/svg+xml",
                isAnimated: false,
              },
              meta: {},
            },
          ]);

          // Then create the image shape with that asset
          editor.createShape({
            type: "image",
            // Center the image in the viewport
            x: width / 2 - imageWidth / 2,
            y: height / 2 - imageHeight / 2,
            props: {
              assetId,
              w: imageWidth,
              h: imageHeight,
            },
          });

          // Close the modal
          setShowDiagramModal(false);
          setDiagramDescription("");
          setMermaidCode("");
          setRenderedSVG(null);
        };
        img.src = svgBase64;
      } catch (error) {
        console.error("Error creating image asset:", error);
      }
    }
  }, [renderedSVG]);

  const captureWhiteboard = async () => {
    if (!editorRef.current) return;

    setIsSummarizing(true);

    try {
      const editor = editorRef.current;

      // Get all shape IDs on the current page
      const shapeIds = editor.getCurrentPageShapeIds();

      if (shapeIds.size === 0) {
        alert("No content on the whiteboard to summarize");
        setIsSummarizing(false);
        return;
      }

      // Export the whiteboard as a PNG blob
      const { blob } = await editor.toImage([...shapeIds], {
        format: "png",
        background: true,
        padding: 16,
        scale: 1,
      });

      // Convert blob to base64
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;

          // Send only the base64 data part (remove the prefix)
          //const base64Content = base64data.split(",")[1];

          // Send the image to the API for summarization
          const response = await fetch("/api/whiteboard", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: base64data,
              type: "summarize",
            }),
          });

          const data = await response.json();

          if (data.success && editorRef.current) {
            // Add text to the whiteboard
            const editor = editorRef.current;
            const { width, height } = editor.getViewportScreenBounds();
            
            // Calculate the shape dimensions based on the text length
            const summaryText = `📋 Whiteboard Summary:\n${data.text}`;
            
            // Estimate width based on text length (characters per line)
            const charsPerLine = 60; // Average number of characters per line
            const lines = Math.ceil(summaryText.length / charsPerLine);
            const estimatedLineCount = lines + (summaryText.split('\n').length - 1);
            
            // Calculate width and height based on text content
            const noteWidth = Math.min(500, Math.max(300, Math.sqrt(summaryText.length) * 20));
            const noteHeight = Math.max(100, estimatedLineCount * 20); // 20px per line
            
            // Create a note shape with the AI summary
            editor.createShape({
              type: "geo",
              x: width / 2 - noteWidth / 2,
              y: height / 2 + 50, // Position below center
              props: {
                richText: toRichText(summaryText),
                color: "green",
                size: "m",
                geo: "rectangle",
                labelColor: "black",
                fill: "none",
                dash: "draw",
                w: noteWidth,
                h: noteHeight,
              },
            });
          } else {
            alert(`Error: ${data.text || "Failed to summarize the whiteboard"}`);
          }
        } catch (error) {
          console.error("Error processing whiteboard data:", error);
          alert("Error processing whiteboard data");
        }
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error capturing whiteboard:", error);
      alert("Failed to capture whiteboard content");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    editor.registerExternalAssetHandler("url", unfurlBookmarkUrl);
  };

  // Custom UI overrides for tldraw
  const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
      return tools;
    },
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 relative">
        <Tldraw
          store={store}
          onMount={handleEditorMount}
          overrides={uiOverrides}
          className="h-full w-full bg-background"
          inferDarkMode
        />
      </div>

      {/* Message input and controls */}
      <div className="p-4 bg-background border-t border-border">
        <div className="flex gap-2">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Send a message to AI..."
              className="flex-1 bg-background border-input text-foreground focus-visible:ring-ring"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              variant="default"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </div>
          <Button
            onClick={() => setShowDiagramModal(true)}
            variant="outline"
            className="gap-1"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Diagram
          </Button>
          <Button
            onClick={captureWhiteboard}
            variant="outline"
            className="gap-1"
            disabled={isSummarizing}
          >
            {isSummarizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-1" />
            )}
            Summarize Board
          </Button>
        </div>
      </div>

      {/* Diagram dialog */}
      <Dialog open={showDiagramModal} onOpenChange={setShowDiagramModal}>
        <DialogContent className="sm:max-w-[1200px] p-0 z-[500]">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle>Create Diagram</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col h-[700px]">
            {/* Top Panel - AI Input Section */}
            <div className="p-4 border-b border-border">
              <div className="flex gap-2 items-center">
                <Input
                  id="diagram-description"
                  placeholder="Describe the diagram you want to create (e.g., Create a flowchart showing user authentication process)"
                  className="resize-none flex-1"
                  value={diagramDescription}
                  onChange={(e) => setDiagramDescription(e.target.value)}
                />
                <Button
                  onClick={handleDiagramRequest}
                  disabled={isLoading || !diagramDescription.trim()}
                  variant="default"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>
            </div>

            {/* Bottom Panel - Code Editor and Preview side by side */}
            <div className="flex-1 flex md:flex-row">
              {/* Left Panel - Code Editor */}
              <div className="w-full md:w-1/2 border-r border-border flex flex-col overflow-auto bg-background p-4">
                <CodeEditor
                  value={mermaidCode}
                  language="mermaid"
                  onChange={(e) => setMermaidCode(e.target.value)}
                  padding={15}
                  style={{
                    backgroundColor: "#000000",
                    fontFamily: "monospace",
                    fontSize: 12,
                    height: "100%",
                  }}
                  className="min-h-[200px] h-full rounded-md border border-border"
                />
                <div className="mt-2 flex justify-end">
                  <Button onClick={renderMermaid} variant="outline" size="sm">
                    Update Preview
                  </Button>
                </div>
              </div>

              {/* Right Panel - Preview */}
              <div className="w-full md:w-1/2 p-4 bg-background overflow-auto">
                <Card className="w-full h-full flex items-center justify-center bg-black rounded-md border border-border p-4 overflow-auto">
                  <div
                    ref={mermaidContainerRef}
                    className="w-full h-full flex items-center justify-center"
                  ></div>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowDiagramModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInsertDiagram}
              disabled={!renderedSVG}
              variant="default"
            >
              Insert Diagram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
