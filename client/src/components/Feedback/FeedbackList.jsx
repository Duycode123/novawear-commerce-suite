import FeedbackItem from "./FeedbackItem";

export default function FeedbackList({ feedbacks }) {
    return (
        <div className="row no-gutters">
            {feedbacks.length > 0 ? feedbacks.map((item, i) => (
                <FeedbackItem key={i} data={item} />
            )) : (
                <p>Chưa có đánh giá nào</p>
            )}
        </div>
    );
}
