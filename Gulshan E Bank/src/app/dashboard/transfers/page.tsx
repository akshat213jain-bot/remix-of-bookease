
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, DollarSign, User, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Contact, ContactList } from "./contact-list";

interface Message {
    id: string;
    type: 'text' | 'payment';
    content: string;
    sender: 'me' | 'them';
    timestamp: string;
    amount?: number;
}

const mockMessages: Message[] = [
    { id: '1', type: 'text', content: 'Hey! Did you get the money I sent last week?', sender: 'them', timestamp: '10:00 AM' },
    { id: '2', type: 'payment', content: 'You received a payment.', sender: 'me', timestamp: '10:02 AM', amount: 500 },
    { id: '3', type: 'text', content: 'Yes, got it! Thanks so much. I\'m paying you back for dinner now.', sender: 'them', timestamp: '10:03 AM' },
    { id: '4',type: 'payment', content: 'You sent a payment.', sender: 'them', timestamp: '10:04 AM', amount: 250 },
    { id: '5', type: 'text', content: 'Received! Pleasure doing business with you 😉', sender: 'me', timestamp: '10:05 AM' },
];

function MessengerView({ contact }: { contact: Contact }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const [amount, setAmount] = useState("");
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    const newMessage: Message = {
        id: String(Date.now()),
        type: 'text',
        content: input,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
    setInput("");
  }

  const handleSendPayment = () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive"});
        return;
    }

     const newMessage: Message = {
        id: String(Date.now()),
        type: 'payment',
        content: 'You sent a payment.',
        sender: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: paymentAmount
    };
    setMessages(prev => [...prev, newMessage]);
    toast({
      title: "Transfer Successful",
      description: `Successfully transferred ₹${paymentAmount} to ${contact.name}.`,
    });
    setAmount("");
    setIsPayModalOpen(false);
  };
    
  return (
    <div className="flex flex-col h-full">
        <CardHeader className="flex flex-row items-center justify-between border-b">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle>{contact.name}</CardTitle>
                    <CardDescription>Online</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className={cn("flex items-end gap-2", message.sender === 'me' ? 'justify-end' : 'justify-start')}>
                         {message.sender === 'them' && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={contact.avatar} />
                                <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        )}
                        {message.type === 'text' ? (
                             <div className={cn("max-w-xs rounded-lg px-4 py-2", message.sender === 'me' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                <p>{message.content}</p>
                                <p className="text-xs opacity-70 mt-1 text-right">{message.timestamp}</p>
                            </div>
                        ) : (
                             <div className={cn("max-w-xs rounded-lg p-4 border w-64", message.sender === 'me' ? 'bg-green-50 border-green-200' : 'bg-secondary border-border')}>
                                 <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full",  message.sender === 'me' ? 'bg-green-100' : 'bg-muted')}>
                                        <DollarSign className={cn("h-6 w-6", message.sender === 'me' ? 'text-green-600' : 'text-muted-foreground')} />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{message.content}</p>
                                        <p className="text-2xl font-bold">₹{message.amount?.toLocaleString()}</p>
                                    </div>
                                 </div>
                                 <p className="text-xs text-muted-foreground mt-2 text-right">{message.timestamp}</p>
                            </div>
                        )}
                         {message.sender === 'me' && (
                             <Avatar className="h-8 w-8">
                                <AvatarFallback><User /></AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                </div>
            </ScrollArea>
             <div className="border-t bg-background p-4">
                <div className="flex items-center gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message or amount..."
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage()}}
                    />
                     <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="flex-shrink-0">
                                <DollarSign className="h-5 w-5 text-primary" />
                                <span className="sr-only">Make Payment</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Send Money</DialogTitle>
                                <DialogDescription>Enter the amount you want to send to {contact.name}.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                <Label htmlFor="amount">Amount (₹)</Label>
                                <Input
                                    id="amount"
                                    name="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className="text-xl h-12"
                                />
                                </div>
                            </div>
                             <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancel</Button>
                                </DialogClose>
                                <Button onClick={handleSendPayment}>Confirm Payment</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button size="icon" onClick={handleSendMessage} disabled={!input.trim()} className="flex-shrink-0">
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Send Message</span>
                    </Button>
                </div>
            </div>
          </div>
        </CardContent>
    </div>
  );
}

function NoContactSelected() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-card">
            <MessageSquare className="h-24 w-24 mb-4" />
            <h2 className="text-2xl font-semibold">Select a contact</h2>
            <p>Choose a contact from the list to start a conversation.</p>
        </div>
    )
}

export default function TransfersPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Fund Transfers</h1>
      <Card className="h-[calc(100vh-12rem)]">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            <div className="md:col-span-1 h-full hidden md:block">
                <ContactList selectedContact={selectedContact} onSelectContact={setSelectedContact} />
            </div>
             <div className="md:col-span-2 h-full">
                {selectedContact ? (
                    <MessengerView contact={selectedContact} />
                ) : (
                    <NoContactSelected />
                )}
            </div>
        </div>
      </Card>
    </div>
  );
}
