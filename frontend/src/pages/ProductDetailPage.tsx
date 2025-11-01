import { useParams } from 'react-router-dom';
import { useProductsServiceGetProductsById } from '../openapi-rq/queries/queries';
import LoadingSpinner from '../components/LoadingSpinner';

export const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const productId = id ? parseInt(id, 10) : undefined;

  const { data: product, isLoading, error } = useProductsServiceGetProductsById(
    { id: productId },
    undefined,
    { enabled: productId !== undefined }
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading product details..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Product</h2>
          <p className="text-gray-600 mb-6">{(error as Error)?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <p className="text-gray-600">The requested product could not be found.</p>
        </div>
      </div>
    );
  }

  // Placeholder for seller info and WhatsApp redirect
  // Seller information is not available from the current API response for a product.
  // This would require backend changes to the product model to include seller details.
  const sellerContact = 'N/A';
  const sellerName = 'N/A';


  const handleWhatsAppRedirect = () => {
    // Assuming sellerContact is a phone number
    if (sellerContact !== 'N/A') {
      window.open(`https://wa.me/${sellerContact}`, '_blank');
    } else {
      alert('Seller contact information not available.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-4">
        <div className="backdrop-blur-md bg-white/80 border border-white/20 shadow-2xl rounded-3xl p-8 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {product.name}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              {/* Product Image */}
              {product.image_id ? (
                <img
                  src={`/api/images/${product.image_id}`}
                  alt={product.name}
                  className="w-full h-64 object-cover rounded-2xl shadow-xl"
                />
              ) : (
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-64 flex items-center justify-center text-gray-500 text-xl rounded-2xl shadow-xl">
                  No Image Available
                </div>
              )}
              <p className="text-gray-700 mt-6 leading-relaxed">{product.description}</p>
            </div>
            <div>
              <p className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ${product.price?.toFixed(2)}
              </p>
              <p className="text-lg mb-6 text-gray-600">Quantity Available: {product.quantity_available}</p>
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                <h2 className="text-xl font-semibold mb-3 text-gray-900">Seller Information</h2>
                <p className="text-gray-700 mb-1">Name: {sellerName}</p>
                <p className="text-gray-700 mb-4">Contact: {sellerContact}</p>
                <button
                  onClick={handleWhatsAppRedirect}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={sellerContact === 'N/A'}
                >
                  Contact Seller on WhatsApp
                </button>
              </div>
              <button
                onClick={handleWhatsAppRedirect}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={sellerContact === 'N/A'}
              >
                Buy on WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};