# VIANNA

Visual Analytics for Neuropsychological test datA

Website: https://vianna.es/

## Overview

VIANNA is a modular visual analytics environment developed within the AI-Mind project to explore and analyze data from the Cambridge Neuropsychological Test Automated Battery (CANTAB). Built in close collaboration with clinical researchers, the system supports exploratory analysis through coordinated multiple views and a workflow-oriented interface.

## Key Capabilities

- Hierarchical navigation to manage complex neuropsychological datasets
- Cohort exploration and interactive filtering
- Group comparison and statistical testing
- Temporal trajectory analysis
- Correlation exploration

## Documentation

- [Hierarchy format](docs/hierarchy-format.md)

## Tech Stack

- React + Vite
- Redux Toolkit
- Ant Design
- D3.js

## Getting Started

Requirements

- Node.js 20+ (CI uses 20)

Install and run

```bash
npm install
npm run dev
```

Desktop AppImage

```bash
npm install
npm run appimage
```

The generated AppImage is written to `release/`.

## Acknowledgements

Developed within the AI-Mind project in collaboration with clinical researchers.
