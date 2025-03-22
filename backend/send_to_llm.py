from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
load_dotenv()

class GeminiClient:
    def __init__(self, api_key):
        """Initialize the Gemini client with the provided API key."""
        self.client = genai.Client(api_key=api_key)
    
    def generate_content(self, prompt, model="gemini-2.0-flash", max_tokens=100, temperature=0.1):
        """
        Generate content using the specified Gemini model.
        
        Args:
            prompt (str): The text prompt to send to the model
            model (str): The Gemini model to use
            max_tokens (int): Maximum number of tokens in the response
            temperature (float): Controls randomness (lower is more deterministic)
            
        Returns:
            str: The generated response text
        """
        response = self.client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=temperature
            )
        )
        return response.text

def main():
    """Main function to demonstrate the Gemini client usage."""
    # Replace with your actual API key
    api_key = os.getenv("GEMMA_API_KEY")
    # Create a client instance
    gemini = GeminiClient(api_key)
    
    # Generate content with a prompt, with increased max tokens
    prompt = "Explain how AI works in detail"
    response = gemini.generate_content(prompt)
    
    # Print the response
    print(response)

if __name__ == "__main__":
    main()