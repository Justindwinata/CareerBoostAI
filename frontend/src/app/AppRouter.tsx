import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "./AppLayout";
import { HistoryPage } from "../pages/HistoryPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ResultPage } from "../pages/ResultPage";
import { UploadPage } from "../pages/UploadPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="results/:analysisId" element={<ResultPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
