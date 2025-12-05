"use server";

import { accountInquiry } from "@/ai/flows/account-inquiry";
import { serviceInquiry } from "@/ai/flows/service-inquiry";

export async function askAssistant(query: string): Promise<string> {
  try {
    const accountKeywords = [
      "account",
      "balance",
      "transaction",
      "statement",
      "deposit",
      "withdrawal",
    ];

    const isAccountQuery = accountKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword)
    );

    if (isAccountQuery) {
      const result = await accountInquiry({ query });
      return result.response;
    } else {
      const result = await serviceInquiry({ query });
      return result.answer;
    }
  } catch (error) {
    console.error("Error in AI assistant:", error);
    return "I'm sorry, but I encountered an error while processing your request. Please try again later.";
  }
}
