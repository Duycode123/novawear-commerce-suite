export default function FeedbackItem({ data }) {
    return (
        <div className="col p-6">
            <div className="feedback-item">
                <div className="feedback-item__rating">
                    {[1, 2, 3, 4, 5].map(star => (
                        <i key={star}
                            className={`fa-solid fa-star ${star > data.rating ? "disabled" : ""}`}></i>
                    ))}
                </div>

                <div className="feedback-item__body">
                    <b className="feedback-userName">{data.username}</b>
                    <i className="feedback-product-type">{data.type}</i>
                    <p className="feedback-of-custom">{data.comment}</p>
                    <p className="feedback-time">{data.date}</p>
                </div>
            </div>
        </div>
    );
}
