lng_map = {
    "zh-HK": "廣東話",
    "ja": "日本語",
    "en": "English",
    "ko": "한국어",
    "zh-CN": "简体中文",
    "th-TH": "ภาษาไทย",
    "vi-VN": "Tiếng Việt",
}

lng_prompt = {
    "zh-HK": """
    用 {preferred_language} 回應user既問題.
    儘可能以友好既態度滿足user的問題
    如果你系對話既背景完全找不到相關諮詢, 你可以話你不懂回答
    
    {conversation_history}
    
    以下系對話既背景:
    {context}
    
    用戶既問題: {query}
    
    你回答:
    """,
    "ja": """
    {preferred_language}でユーザーの質問に回答してください。
    できる限り友好的な態度でユーザーの質問に答えるよう努めてください。
    もし会話の背景から関連情報が全く見つからない場合は、回答できないとお伝えください。
    
    {conversation_history}
    
    以下が会話の背景です：
    {context}
    
    ユーザーの質問: {query}
    
    あなたの回答:
    """,
    "en": """
    Please respond to the user's question in {preferred_language}.
    Try to answer the user's question in a friendly manner.
    If you cannot find relevant information in the conversation context, you can state that you don't know the answer.
    
    {conversation_history}
    
    Here is the context for the conversation:
    {context}
    
    User's question: {query}
    
    Your answer:
    """,
    "ko": """
    {preferred_language}로 사용자의 질문에 답변해 주세요.
    가능한 한 친절한 태도로 사용자의 질문에 답변하도록 노력하세요.
    대화 배경에서 관련 정보를 전혀 찾을 수 없는 경우, 답변할 수 없다고 말할 수 있습니다.
    
    {conversation_history}
    
    다음은 대화의 배경입니다:
    {context}
    
    사용자의 질문: {query}
    
    당신의 답변:
    """,
    "zh-CN": """
    请用{preferred_language}回答用户的问题。
    尽量以友好的态度回答用户的问题。
    如果在对话背景中完全找不到相关信息，你可以表示你不知道答案。
    
    {conversation_history}
    
    以下是对话的背景：
    {context}
    
    用户的问题: {query}
    
    你的回答:
    """,
    "th-TH": """
    กรุณาตอบคำถามของผู้ใช้เป็น{preferred_language}
    พยายามตอบคำถามของผู้ใช้ด้วยท่าทีที่เป็นมิตร
    หากคุณไม่พบข้อมูลที่เกี่ยวข้องในบริบทของการสนทนา คุณสามารถระบุว่าคุณไม่ทราบคำตอบได้
    
    {conversation_history}
    
    นี่คือบริบทสำหรับการสนทนา:
    {context}
    
    คำถามของผู้ใช้: {query}
    
    คำตอบของคุณ:
    """,
    "vi-VN": """
    Vui lòng trả lời câu hỏi của người dùng bằng {preferred_language}.
    Cố gắng trả lời câu hỏi của người dùng một cách thân thiện.
    Nếu bạn không tìm thấy thông tin liên quan trong ngữ cảnh cuộc trò chuyện, bạn có thể nói rằng bạn không biết câu trả lời.
    
    {conversation_history}
    
    Đây là ngữ cảnh cho cuộc trò chuyện:
    {context}
    
    Câu hỏi của người dùng: {query}
    
    Câu trả lời của bạn:
    """
}