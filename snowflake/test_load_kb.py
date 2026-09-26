import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from load_kb import chunk_text, collect, sql_literal, to_sql
class LoaderTests(unittest.TestCase):
 def test_chunk_bounds_and_coverage(self):
  text="a"*3500
  chunks=list(chunk_text(text))
  self.assertTrue(all(len(c)<=1200 for c in chunks))
  self.assertEqual(sum(map(len,chunks))-200*(len(chunks)-1),len(text))
 def test_official_source_and_metadata(self):
  with TemporaryDirectory() as d:
   p=Path(d)/"chatgpt";p.mkdir()
   f=p/"test.txt";f.write_text("URL: https://help.openai.com/article\nTITLE: Test\n\nPublic policy")
   self.assertEqual(collect(Path(d))[0]["TOOL_ID"],"chatgpt")
   f.write_text("URL: https://openai.com.evil.example/article\nTITLE: Test\n\nText")
   with self.assertRaises(ValueError):collect(Path(d))
 def test_sql_escaping(self):
  self.assertEqual(sql_literal("it's a \\ path"),"'it''s a \\\\ path'")
  sql=to_sql([dict(TOOL_ID="chatgpt",TOOL_NAME="ChatGPT",SOURCE_URL="https://openai.com/x",SOURCE_TITLE="T",CHUNK_TEXT="O'Brien")])
  self.assertIn("'O''Brien'",sql);self.assertIn("DELETE FROM PROMPTSHIELD.KB.POLICY_CHUNKS",sql)
if __name__=="__main__":unittest.main()
