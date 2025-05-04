const data = 
    [
        {
          "question": "Which combination of models is used in the ensemble approach for detecting rice grain quality in the study?",
          "options": {
            "A": "Faster R-CNN, RetinaNet, and YOLOv8",
            "B": "SVM, CNN, and YOLOv8",
            "C": "Faster R-CNN, YOLOv5, and CNN",
            "D": "SVM, Faster R-CNN, and RetinaNet"
          },
          "answer": "A",
          "hints": [
            "The study uses a multi-model ensemble approach.",
            "YOLOv8 is one of the models used.",
            "The ensemble consists of Faster R-CNN, RetinaNet, and YOLOv8."
          ],
          "difficulty": "Medium",
          "id": "q-pxilb2e",
          "approved": false
        },
        {
          "question": "What is the intended application for the automated rice quality detection system described in the study?",
          "options": {
            "A": "Real-time assessments at storage facilities",
            "B": "Online retail sales",
            "C": "Cooking process monitoring",
            "D": "Export quality certification"
          },
          "answer": "A",
          "hints": [
            "The system is designed for practical use.",
            "It is optimized for mobile setups.",
            "The focus is on real-time assessments at storage facilities."
          ],
          "difficulty": "Easy",
          "id": "q-aio6emu",
          "approved": false
        },
        {
          "question": "What does the dataset used in the study include, according to the methodology section?",
          "options": {
            "A": "Only rice grain types",
            "B": "Diverse rice grain types and foreign objects",
            "C": "Only foreign objects",
            "D": "Only broken-chalky rice grains"
          },
          "answer": "B",
          "hints": [
            "The dataset is diverse.",
            "It includes more than just rice grains.",
            "It comprises diverse rice grain types and foreign objects."
          ],
          "difficulty": "Medium",
          "id": "q-3506rfb",
          "approved": true
        },
        {
          "question": "Which object detection model used in the study is known for real-time detection and high accuracy?",
          "options": {
            "A": "YOLOv8",
            "B": "Faster R-CNN",
            "C": "RetinaNet",
            "D": "SSD"
          },
          "answer": "A",
          "hints": [
            "It is suitable for applications requiring quick processing.",
            "It features a convolutional backbone with FPN.",
            "It uses focus and CSP layers for efficient detail capture."
          ],
          "difficulty": "Medium",
          "id": "q-31y0rly",
          "approved": true
        },
        {
          "question": "How was the dataset split in the rice quality assessment study?",
          "options": {
            "A": "60% training, 20% validation, 20% test",
            "B": "70% training, 20% validation, 10% test",
            "C": "50% training, 30% validation, 20% test",
            "D": "80% training, 10% validation, 10% test"
          },
          "answer": "B",
          "hints": [
            "The largest portion was allocated for training.",
            "The validation set was twice the size of the test set.",
            "70% of the data was used for training."
          ],
          "difficulty": "Easy",
          "id": "q-uxlw5ta",
          "approved": true
        },
        {
          "question": "What is the purpose of the ensemble approach in the study?",
          "options": {
            "A": "To increase data diversity",
            "B": "To simulate real-world scenarios",
            "C": "To leverage model strengths and enhance accuracy",
            "D": "To reduce image noise"
          },
          "answer": "C",
          "hints": [
            "It combines multiple models.",
            "The goal is to improve overall model performance.",
            "It ensures robustness across diverse rice types."
          ],
          "difficulty": "Hard",
          "id": "q-zpjyz00",
          "approved": true
        },
        {
          "question": "Which model utilizes Feature Pyramid Networks (FPN) for multi-scale object detection?",
          "options": {
            "A": "YOLOv8",
            "B": "RetinaNet",
            "C": "Faster R-CNN",
            "D": "Detectron2"
          },
          "answer": "B",
          "hints": [
            "It is a two-stage detection model.",
            "It excels at detecting small and overlapping objects.",
            "It also incorporates dual subnets for classification and bounding box regression."
          ],
          "difficulty": "Medium",
          "id": "q-e9bpley",
          "approved": true
        },
        {
          "question": "What is the primary purpose of Non-Maximum Suppression (NMS) in object detection models?",
          "options": {
            "A": "To increase the speed of detection",
            "B": "To enhance the resolution of images",
            "C": "To reduce false positives by merging predictions",
            "D": "To improve the training efficiency"
          },
          "answer": "C",
          "hints": [
            "It's a technique used after predictions are generated.",
            "It helps in managing multiple predictions for the same object.",
            "It's especially useful in ensemble models combining outputs from different detectors."
          ],
          "difficulty": "Easy",
          "id": "q-xerjt2q",
          "approved": true
        },
        {
          "question": "Which evaluation metric measures the bounding box accuracy in object detection models?",
          "options": {
            "A": "Mean Average Precision (mAP)",
            "B": "Intersection over Union (IoU)",
            "C": "CIoU loss",
            "D": "Recall"
          },
          "answer": "C",
          "hints": [
            "It's a more specific metric than IoU.",
            "It evaluates how well the predicted bounding box aligns with the ground truth.",
            "It is named with a 'C' at the beginning."
          ],
          "difficulty": "Hard",
          "id": "q-g5oigdi",
          "approved": true
        },
        {
          "question": "Which machine learning model mentioned in the document is noted for its rapid, real-time performance?",
          "options": {
            "A": "RetinaNet",
            "B": "YOLOv8",
            "C": "Faster R-CNN",
            "D": "ResNet"
          },
          "answer": "B",
          "hints": [
            "This model is known for its speed in detection tasks.",
            "It's suitable for field applications.",
            "The name includes 'YOLO'."
          ],
          "difficulty": "Medium",
          "id": "q-h0pxlzm",
          "approved": true
        },
        {
          "question": "What method is used to address challenges like dataset imbalance and small object detection?",
          "options": {
            "A": "Data pruning",
            "B": "Data augmentation",
            "C": "Data normalization",
            "D": "Data encryption"
          },
          "answer": "B",
          "hints": [
            "This method involves modifying the training data.",
            "It helps increase the diversity of the dataset.",
            "Techniques include flipping, rotating, and scaling images."
          ],
          "difficulty": "Easy",
          "id": "q-rgkpl2l",
          "approved": true
        },
        {
          "question": "Which technology is mentioned for real-time mobile app development in the deployment strategy?",
          "options": {
            "A": "React Native",
            "B": "Flutter",
            "C": "Swift",
            "D": "Kotlin"
          },
          "answer": "B",
          "hints": [
            "It's a UI toolkit created by Google.",
            "This technology is known for building natively compiled applications.",
            "It uses the Dart programming language."
          ],
          "difficulty": "Medium",
          "id": "q-x5ce7j8",
          "approved": true
        }
      ]


// return the whole data as a json response
export async function GET() {
    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
}
