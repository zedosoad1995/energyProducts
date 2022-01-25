import axios from 'axios';

export async function getProducts(limit, skip){
    const {data: {products, header}} = await axios.post('http://localhost:8000/api/products', {
        tableOptions: {attributesToDisplay: ['distributor', 'category', 'Altura', 'rating', 'numReviews', 'Peso']},
        limit,
        skip
    });
    
    const columns = header.map(res => {
        return {Header: res, accessor: res}
    });

    return {products, columns};
}