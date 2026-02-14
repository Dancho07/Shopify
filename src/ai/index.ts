import { config } from "../config.js";
import { OpenAiProvider } from "./openAiProvider.js";
import { RuleBasedProvider } from "./ruleBasedProvider.js";

export const aiProvider = config.openAiApiKey ? new OpenAiProvider(config.openAiApiKey) : new RuleBasedProvider();
