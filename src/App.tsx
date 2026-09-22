import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SubmissionsList from './pages/SubmissionsList';
import NewSubmission from './pages/NewSubmission';
import SubmissionDetail from './pages/SubmissionDetail';
import GroupsList from './pages/GroupsList';
import NewGroup from './pages/NewGroup';
import GroupDetail from './pages/GroupDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<SubmissionsList />} />
          <Route path="new" element={<NewSubmission />} />
          <Route path="submissions/:id" element={<SubmissionDetail />} />
          
          {/* Groups routes */}
          <Route path="groups" element={<GroupsList />} />
          <Route path="groups/new" element={<NewGroup />} />
          <Route path="groups/:id" element={<GroupDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
