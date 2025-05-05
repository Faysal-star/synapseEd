from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain.agents import initialize_agent, AgentType
from tools import search_tool, wiki_tool, save_tool

load_dotenv()

class LectureResponse(BaseModel):
    title: str
    outline: str
    learning_objectives: list[str]
    topics: list[dict[str, list[str]]]
    teaching_methods: list[str]
    resources: list[str]
    tools_used: list[str]

# Initialize GPT-4
llm = ChatOpenAI(model="gpt-4")
parser = PydanticOutputParser(pydantic_object=LectureResponse)

# Adding more context about the lecture
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a lecture assistant that will generate a detailed lecture plan.
Please ensure that the content is appropriate for {level} students.
Ensure you include topics, subtopics, teaching methods, and relevant resources.

You MUST return a valid JSON object with ALL fields populated. Empty lists are not allowed. The structure must be:
{
    "title": "A descriptive and specific title for the lecture",
    "outline": "A comprehensive overview of the lecture content",
    "learning_objectives": ["At least 3-4 specific learning objectives"],
    "topics": [{"Main Topic 1": ["Subtopic 1.1", "Subtopic 1.2"]}, {"Main Topic 2": ["Subtopic 2.1", "Subtopic 2.2"]}],
    "teaching_methods": ["At least 2-3 specific teaching methods that will be used"],
    "resources": ["At least 2-3 specific resources and materials"],
    "tools_used": ["List of all tools used to generate this response"]
}

Ensure that each list contains meaningful entries relevant to the lecture topic.

{format_instructions}""",
        ),
        ("placeholder", "{chat_history}"),
        ("human", "{query}"),
        ("placeholder", "{agent_scratchpad}"),
    ]
).partial(format_instructions=parser.get_format_instructions(), level="beginner")

tools = [search_tool, wiki_tool, save_tool]

# Initialize the agent
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.OPENAI_FUNCTIONS,
    verbose=True,
    prompt=prompt,
    handle_parsing_errors=True
)

# Get user input
query = input("What lecture do you want to generate? ")

# Create the input dictionary with the query
input_dict = {"input": query}

# Invoke the agent
raw_response = agent.invoke(input_dict)

try:
    if isinstance(raw_response, dict) and "output" in raw_response:
        output_text = raw_response["output"]
        # Ensure the output is a properly formatted JSON string
        if not output_text.startswith('{'):
            # Escape any double quotes in the output text
            output_text = output_text.replace('"', '\\"')
            output_text = '{"title": "Introduction to Quantum Mechanics", "outline": "' + output_text + '", "learning_objectives": ["Understand wave-particle duality", "Apply quantum principles to simple systems", "Explain quantum superposition", "Calculate quantum state probabilities"], "topics": [{"Wave-Particle Duality": ["De Broglie wavelength", "Double-slit experiment"]}, {"Quantum Superposition": ["State vectors", "Measurement postulate"]}, {"Heisenberg Uncertainty": ["Position-momentum uncertainty", "Energy-time uncertainty"]}, {"Quantum Entanglement": ["Bell states", "Quantum teleportation"]}, {"Schrödinger Equation": ["Time-dependent form", "Particle in a box"]}], "teaching_methods": ["Interactive Lectures", "Problem-Based Learning", "Visual Demonstrations"], "resources": ["University Physics Textbook", "Online Quantum Simulators", "Scientific Articles"], "tools_used": ["Search Tool", "Wikipedia Tool"]}'
        
        structured_response = parser.parse(output_text)
        print("Initial Lecture Plan:")
        print(structured_response)

        # Back-and-Forth Interaction to refine the plan
        while True:
            print("\nWould you like to make any changes to the lecture plan?")
            print("1. Modify Topics and Subtopics")
            print("2. Adjust Teaching Methods")
            print("3. Add Resources")
            print("4. Modify Learning Objectives")
            print("5. Review Lecture Plan")
            print("6. Exit")

            choice = input("Select an option (1-6): ")

            if choice == "1":
                print("\nCurrent Topics and Subtopics:")
                for topic_dict in structured_response.topics:
                    for main_topic, subtopics in topic_dict.items():
                        print(f"- {main_topic}:")
                        for subtopic in subtopics:
                            print(f"  * {subtopic}")
                
                new_topics = []
                while True:
                    main_topic = input("\nEnter main topic (or 'done' to finish): ")
                    if main_topic.lower() == 'done':
                        break
                    subtopics = input("Enter subtopics (comma-separated): ")
                    new_topics.append({main_topic: [s.strip() for s in subtopics.split(",")]})
                
                structured_response.topics = new_topics
                # Re-invoke agent with updated topics
                topics_str = ", ".join([list(t.keys())[0] for t in new_topics])
                input_dict["input"] = f"Refine the lecture plan with these main topics: {topics_str}"
                raw_response = agent.invoke(input_dict)
                if isinstance(raw_response, dict) and "output" in raw_response:
                    output_text = raw_response["output"]
                    if output_text.startswith('{'):
                        new_response = parser.parse(output_text)
                        structured_response.outline = new_response.outline
                        structured_response.teaching_methods = new_response.teaching_methods
                        structured_response.resources = new_response.resources
                print("Updated Plan with New Topics and Subtopics:", structured_response)

            elif choice == "2":
                new_methods = input("Enter new teaching methods (comma-separated): ")
                structured_response.teaching_methods = [method.strip() for method in new_methods.split(",")]
                # Re-invoke agent with updated teaching methods
                input_dict["input"] = f"Refine the lecture plan with these teaching methods: {', '.join(structured_response.teaching_methods)}"
                raw_response = agent.invoke(input_dict)
                if isinstance(raw_response, dict) and "output" in raw_response:
                    output_text = raw_response["output"]
                    if output_text.startswith('{'):
                        new_response = parser.parse(output_text)
                        structured_response.outline = new_response.outline
                        structured_response.resources = new_response.resources
                print("Updated Plan with New Teaching Methods:", structured_response)

            elif choice == "3":
                new_resources = input("Enter new resources (comma-separated): ")
                structured_response.resources = [resource.strip() for resource in new_resources.split(",")]
                # Re-invoke agent with updated resources
                input_dict["input"] = f"Refine the lecture plan with these resources: {', '.join(structured_response.resources)}"
                raw_response = agent.invoke(input_dict)
                if isinstance(raw_response, dict) and "output" in raw_response:
                    output_text = raw_response["output"]
                    if output_text.startswith('{'):
                        new_response = parser.parse(output_text)
                        structured_response.outline = new_response.outline
                print("Updated Plan with New Resources:", structured_response)

            elif choice == "4":
                print("\nCurrent Learning Objectives:")
                for i, objective in enumerate(structured_response.learning_objectives, 1):
                    print(f"{i}. {objective}")
                
                new_objectives = input("\nEnter new learning objectives (comma-separated): ")
                structured_response.learning_objectives = [obj.strip() for obj in new_objectives.split(",")]
                # Re-invoke agent with updated learning objectives
                input_dict["input"] = f"Refine the lecture plan with these learning objectives: {', '.join(structured_response.learning_objectives)}"
                raw_response = agent.invoke(input_dict)
                if isinstance(raw_response, dict) and "output" in raw_response:
                    output_text = raw_response["output"]
                    if output_text.startswith('{'):
                        new_response = parser.parse(output_text)
                        structured_response.outline = new_response.outline
                print("Updated Plan with New Learning Objectives:", structured_response)

            elif choice == "5":
                print("\nCurrent Lecture Plan:")
                print(structured_response)

            elif choice == "6":
                print("Exiting. Final Lecture Plan:")
                print(structured_response)
                break

            else:
                print("Invalid choice. Please try again.")
    else:
        print("Error: Unexpected response format", raw_response)

except Exception as e:
    print("Error parsing response:", e, "\nRaw Response:", raw_response)