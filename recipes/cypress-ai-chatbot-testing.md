# Cypress AI Chatbot Testing

The following page provides an example of how to test an AI chatbot using Cypress. While we're switching away from Cypress, it can still be useful regardless of the testing framework that is used.

## Context

An AI chatbot was created for the Solution Tree project. This chatbot would be featured across the whole Avanti platform and it's primary feature would be to assist users with their problems and recommended them a relavant video.

### AI Chatbot Details

Type - Assistant
Model - `gpt-4o-mini`
Tools - File Search
Vector store - `.json` with the contents of the platform
System instructions - Explanations of the platform specific terms, instruction on how to communicate with the user and basic guardrails to keep the chatbot relevant.

## Testing Approach

There are multiple of ways to approach this testing scenario. Our goal is to test the chatbot and make sure it's returning correct, relevant and complete responses while adhering to the guardrails.
Since the AI chatbot responses are dynamic and rarely the same for the exact inputs, we cannot "hardcode" expected responses.

#### Testing AI using AI

To resolve this "issue" we will be using another AI model to evaluate the response of the chatbot that will return us a `true/false` result whether the response is relavant, correct, complete and adheres to the guardrails.
This allows us to easily write test cases since we only need to check for `true/false` check on the relevance of the answer.

## The Code

```
cy.fixture('chatbot-prompts.json').then(tests => {
      tests.forEach(({ prompt, expectations, relevant }) => {
        cy.intercept(CHATBOT_URL).as(`chatbotResponse ${prompt}`);
```

`chatbot-prompts.json` - file that contains a list of prompts, their expectations, and if relevant answer is expected or not.
We proceed for each prompt to intercept the response request.

```
        cy.findAllByPlaceholderText('Ask anything...')
          .clear()
          .type(`${prompt}{enter}`);
        cy.wait(`@chatbotResponse ${prompt}`, { timeout: 45000 });
```

After typing and sending the prompt, we are waiting for the response.

```
        cy.get('[data-testid="chat-response"]')
          .last()
          .should('exist')
          .invoke('text')
          .then(responseText => {
            cy.task('evaluateResponse', {
              prompt,
              response: responseText,
              expectations,
            })
```

The response is fetched and passed to a task called `evaluateResponse`. This task does the whole magic. It will then return a result that will contain a `true` or `false` value whether the response is relevant.

```
              .should(result => {
                expect(
                  result.relevant,
                  `Should be relevant to "${prompt}"`,
                ).to.equal(relevant);
              })
              .then(result => cy.log(result.notes));
          });
      });
 });
```

Finally we assert the result and log it for easier debugging in case the test fails.

## Task `Evaluate Response`

```
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const model = process.env.OPENAI_MODEL || 'gpt-4';

async function evaluateResponse({
  prompt,
  response,
  expectations,
  guardrailExpected,
}) {
```

Function receives the original `prompt` that was sent, `response` from the chatbot, `expectations` that were set for that prompt and well if hitting the `guardrail` is expected or not.

```
  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'system',
        content: `You are a QA assistant tasked with evaluating chatbot responses for relevance,
        completeness, and adherence to guardrails. Relevant is anything related to the prompt,
        including a question back asking for more info. Expected topics contain a list of expected words.
        If the response contains anything related to any of the expected topics, return relevance as true.
        Respond ONLY with valid JSON that matches this format:
          {
            "relevant": true/false,
            "missingKeywords": [],
            "violatedGuardrails": true/false,
            "notes": "short explanation"
          }`,
      },
      {
        role: 'user',
        content: `
            Prompt: ${prompt}
            Response: ${response}
            Expected Topics: ${expectations.join(', ')}
            Guardrail Expected: ${guardrailExpected ? 'Yes' : 'No'}
            Evaluate the response using the required JSON format.
        `,
      },
    ],
    temperature: 0.2,
  });

```

We then send a message with the data to, in our case GPT 4, alongside the content explaining the context and the response format that we expect from it.

That includes is the response relevant, is it missing any required keywords (expectations), did it violate guardrails and notes containing the reasoning behind the answer.

```

  const message = completion.choices[0].message.content.trim();

  try {
    return JSON.parse(message);
  } catch (err) {
    console.error('Failed to parse GPT response as JSON:\n', message);
    throw new Error('Invalid JSON returned by GPT');
  }
}

module.exports = evaluateResponse;
```

At the end we simply parse the response and return it.

## Results

Using this method we were able to quickly test a long list of prompts and responses for their relevances. Also since there is nothing hardcoded, everytime the chatbot assistant gets updated with the new RAG or data, the test will continue to run as expected and won't fail (if the chatbot still responses as it should).

This approach also allows for testing prompt injection, payload splitting, and other passive and active prompt attacks.
