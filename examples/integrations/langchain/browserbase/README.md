# Langchain Integration

Add Browserbase to your Langchain application (Python).

## Introduction

Langchain is a Python framework to build applications on top of large-language models (OpenAI, Llama, Gemini).

Building on top of LLMs comes with many challenges:

- Gathering and preparing the data (context) and providing memory to models
- Orchestrating tasks to match LLM API requirements (ex, rate limiting, chunking) 
- Parse the different LLM result format

Langchain comes with a set of high-level concepts and tools to cope with those challenges:

- Retrieval modules such as Document Loaders or Text splitter help with gathering and preparing the data provided to the models
- Model I/O is a set of tools that help to normalize the APIs across multiple models (ex: Prompt Templates)
- Agents and Tools help to build reasoning (ex: how to answer based on provided context, what actions to take)
- Chains help in orchestrating all the above

Browserbase provides a Document Loader to enable your Langchain application to browse the web to:

- Extract text or raw HTML, including from web pages using JavaScript or dynamically rendered text
- Load images via screenshots