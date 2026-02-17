flowchart TD

A([Start]) --> B[User Login]
B --> C[Open AQI Dashboard]

C --> D[Input Today's AQI Data]

D --> E{Is Data Complete?}

E -->|No| F[Prompt User to Complete Inputs]
F --> D

E -->|Yes| G[Submit Data]

G --> H[Validate Data Format]

H --> I{Valid?}

I -->|No| J[Show Input Error]
J --> D

I -->|Yes| K[Send Data to Prediction API]

K --> L[Model Generates AQI Prediction]

L --> M[Store Prediction in Database]

M --> N[Fetch Latest Prediction]

N --> O[View Predicted AQI]

O --> P([End])


%% 🎨 Styling

classDef startEnd fill:#ff6b6b,color:#fff,stroke:#333,stroke-width:2px
classDef user fill:#6a89cc,color:#fff,stroke:#333,stroke-width:1px
classDef decision fill:#ffe66d,color:#000,stroke:#333,stroke-width:1px
classDef system fill:#4ecdc4,color:#000,stroke:#333,stroke-width:1px
classDef output fill:#ff9f1c,color:#000,stroke:#333,stroke-width:1px
classDef error fill:#f78fb3,color:#000,stroke:#333,stroke-width:1px

class A,P startEnd
class B,C,D,F,G user
class E,I decision
class H,K,L,M,N system
class O output
class J error
