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

## Stagehand Integration

Automate browser tasks using natural language instructions with CrewAI

This tool integrates the Stagehand Python SDK with CrewAI, allowing agents to interact with websites and automate browser tasks using natural language instructions.

### Description

The StagehandTool wraps the Stagehand Python SDK to provide CrewAI agents with the ability to control a real web browser and interact with websites using three core primitives:

- **Act**: Perform actions like clicking, typing, or navigating
- **Extract**: Extract structured data from web pages  
- **Observe**: Identify and analyze elements on the page

### Requirements

Before using this tool, you will need:

- A Browserbase account with API key and project ID
- An API key for an LLM (OpenAI or Anthropic Claude)
- The Stagehand Python SDK installed
