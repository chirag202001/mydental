"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getWhatsAppUrl,
  MESSAGE_TEMPLATES,
  type MessageTemplateParams,
  type TemplateKey,
} from "@/lib/whatsapp";
import { MessageCircle, Send, ChevronDown } from "lucide-react";

interface WhatsAppButtonProps {
  phone: string | null | undefined;
  templateParams: MessageTemplateParams;
  /** Which templates to show. Defaults to all. */
  templates?: TemplateKey[];
  /** Button size variant */
  size?: "sm" | "default" | "icon";
  /** Extra class names */
  className?: string;
}

export function WhatsAppButton({
  phone,
  templateParams,
  templates,
  size = "sm",
  className = "",
}: WhatsAppButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [customMsg, setCustomMsg] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  if (!phone) return null;

  const availableTemplates = templates
    ? MESSAGE_TEMPLATES.filter((t) => templates.includes(t.key))
    : MESSAGE_TEMPLATES;

  function openWhatsApp(message?: string) {
    const url = getWhatsAppUrl(phone!, message);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setShowMenu(false);
    setShowCustom(false);
  }

  // Simple button for icon-only or when there's just one template
  if (size === "icon") {
    return (
      <button
        onClick={() => openWhatsApp(availableTemplates[0]?.getMessage(templateParams))}
        className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-green-600 hover:bg-green-50 transition-colors ${className}`}
        title={`WhatsApp ${templateParams.patientName}`}
      >
        <MessageCircle className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex">
        <Button
          variant="outline"
          size={size}
          className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 gap-1.5"
          onClick={() => openWhatsApp(availableTemplates[0]?.getMessage(templateParams))}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        {availableTemplates.length > 1 && (
          <Button
            variant="outline"
            size={size}
            className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 px-1.5 border-l-0 rounded-l-none -ml-px"
            onClick={() => setShowMenu(!showMenu)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowMenu(false);
              setShowCustom(false);
            }}
          />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[260px]">
            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
              Choose message template
            </div>
            {availableTemplates.map((template) => (
              <button
                key={template.key}
                onClick={() =>
                  openWhatsApp(template.getMessage(templateParams))
                }
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Send className="h-3 w-3 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium">{template.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {template.getMessage(templateParams).slice(0, 60)}…
                  </p>
                </div>
              </button>
            ))}
            <div className="border-t">
              {showCustom ? (
                <div className="p-3 space-y-2">
                  <textarea
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="Type your message…"
                    rows={3}
                    className="w-full border rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => openWhatsApp(customMsg)}
                    disabled={!customMsg.trim()}
                  >
                    <Send className="h-3 w-3 mr-1" /> Send Custom
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustom(true)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-muted-foreground"
                >
                  ✏️ Write custom message…
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
