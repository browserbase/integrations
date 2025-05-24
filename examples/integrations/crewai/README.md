# crewAI Integration

Let your crewAI Agent browse the web like a human.

## Overview

One of the most advanced use cases of LLM are AI Agents - programs designed to perform tasks based on high-level instructions.

crewAI is a framework to create Crews, teams of Agents working together on a given problem. For example, searching for a flight.

AI Agents rely on tools to gather rich contexts and perform actions to achieve such results.

## Browserbase Integration

Browserbase provides a `BrowserbaseLoadTool` that Agents can use to retrieve context from complex webpages, enabling them to:

- Extract text from webpages using JavaScript or anti-bot mechanisms
- Capture Images from webpages