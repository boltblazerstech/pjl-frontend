import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SubmissionsList from './pages/SubmissionsList';
import NewSubmission from './pages/NewSubmission';
import SubmissionDetail from './pages/SubmissionDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<SubmissionsList />} />
          <Route path="new" element={<NewSubmission />} />
          <Route path="submissions/:id" element={<SubmissionDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
