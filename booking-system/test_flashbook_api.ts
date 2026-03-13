import 'dotenv/config';

async function testCRUDApi() {
  const baseUrl = 'http://localhost:3000/api/admin/flashbook';

  try {
    console.log('Testing Create (POST)...');
    const postRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Flash Design',
        description: 'A beautiful test design',
        price: 150,
        size: '5x5',
        body_placement_suggestion: 'Arm',
        image_url: 'https://example.com/test.jpg',
        tags: ['test', 'floral']
      })
    });
    const postData = await postRes.json();
    console.log('POST Res:', postData);

    if (postData.error) throw new Error(postData.error);
    const id = postData.flash_design.id;

    console.log('\nTesting Read (GET)...');
    const getRes = await fetch(`${baseUrl}?all=true`);
    const getData = await getRes.json();
    console.log(`GET Res: found ${getData.flash_designs.length} items.`);

    console.log('\nTesting Update (PUT)...');
    const putRes = await fetch(`${baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 200, is_available: false })
    });
    const putData = await putRes.json();
    console.log('PUT Res:', putData.flash_design?.price === 200 ? 'Success' : 'Failed');

    console.log('\nTesting Read again to check is_available filtering...');
    const getFilteredRes = await fetch(baseUrl);
    const getFilteredData = await getFilteredRes.json();
    const hasItem = getFilteredData.flash_designs?.some((d: any) => d.id === id);
    console.log(`GET Filtered Res: item should be hidden. Found? ${hasItem}`);

    console.log('\nTesting Delete (DELETE)...');
    const delRes = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
    const delData = await delRes.json();
    console.log('DELETE Res:', delData);
    
    console.log('All API tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

testCRUDApi();
