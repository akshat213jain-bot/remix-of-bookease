
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount?: number;
}

const mockContacts: Contact[] = [
  {
    id: "1",
    name: "John Doe",
    avatar: "https://picsum.photos/100/100",
    lastMessage: "Received! Pleasure doing business with you 😉",
    lastMessageTime: "10:05 AM",
    unreadCount: 0,
  },
  {
    id: "2",
    name: "Jane Smith",
    avatar: "https://picsum.photos/101/101",
    lastMessage: "Can you send me the invoice?",
    lastMessageTime: "Yesterday",
    unreadCount: 2,
  },
  {
    id: "3",
    name: "Alex Johnson",
    avatar: "https://picsum.photos/102/102",
    lastMessage: "Sure, I'll check it out.",
    lastMessageTime: "2d ago",
  },
  {
    id: "4",
    name: "Emily Brown",
    avatar: "https://picsum.photos/103/103",
    lastMessage: "Payment successful. Thanks!",
    lastMessageTime: "3d ago",
  },
];

interface ContactListProps {
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
}

export function ContactList({ selectedContact, onSelectContact }: ContactListProps) {
  return (
    <div className="border-r bg-card h-full flex flex-col">
        <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Contacts</h2>
        </div>
        <ul className="divide-y overflow-y-auto">
            {mockContacts.map((contact) => (
                <li key={contact.id}>
                    <button
                        className={cn(
                            "w-full text-left p-4 hover:bg-secondary transition-colors",
                            selectedContact?.id === contact.id && "bg-secondary"
                        )}
                        onClick={() => onSelectContact(contact)}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={contact.avatar} data-ai-hint="person portrait" />
                                <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{contact.name}</p>
                                <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-muted-foreground">{contact.lastMessageTime}</p>
                                {contact.unreadCount && contact.unreadCount > 0 && (
                                    <div className="mt-1 ml-auto bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                        {contact.unreadCount}
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                </li>
            ))}
        </ul>
    </div>
  );
}
